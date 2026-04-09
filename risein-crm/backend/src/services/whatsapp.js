const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

let whatsappClient = null;
let whatsappStatus = "disconnected";
let currentQR = null;
let qrCount = 0;
let lastError = null;
let statusHeartbeat = null;
let watchdogTimer = null;

function stopWatchdog() {
    if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
    }
}

function startWatchdog(io, prisma) {
    stopWatchdog();
    watchdogTimer = setTimeout(async () => {
        if (whatsappStatus === "initializing" || whatsappStatus === "waiting_qr") {
            console.error("🚨 Watchdog triggered: WhatsApp stuck in initialization/waiting for QR. Restarting...");
            await initWhatsApp(io, prisma);
        }
    }, 180000); // 3 minutes timeout for QR/Init
}

function cleanSingletonLock(dir) {
    if (!fs.existsSync(dir)) return;
    
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                cleanSingletonLock(fullPath);
            } else if (file === "SingletonLock" || file === "LOCK") {
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`✅ DISCARDED stale lock file: ${fullPath}`);
                } catch (e) {
                    console.warn(`⚠️ Failed to delete lock ${fullPath}:`, e.message);
                }
            }
        });
    } catch (err) {
        console.warn(`⚠️ Error scanning directory ${dir} for locks:`, err.message);
    }
}

async function initWhatsApp(io, prisma) {
    console.log("🚀 Starting WhatsApp Service...");
    whatsappStatus = "initializing";
    io.emit("whatsapp:status", { status: "initializing" });
    startWatchdog(io, prisma);
    
    try {
        if (whatsappClient) {
            console.log("♻️  Cleaning up previous instance...");
            try {
                await whatsappClient.destroy();
                console.log("✅ Previous instance destroyed.");
            } catch (e) {
                console.warn("⚠️ Error destroying previous instance:", e.message);
            }
        }

        const authPath = path.join(process.cwd(), ".wwebjs_auth");
        console.log("🧹 Clearing browser locks...");
        cleanSingletonLock(authPath);

        console.log("📦 Creating WhatsApp Client...");
        const isWindows = process.platform === "win32";
        const defaultExecPath = isWindows ? undefined : "/usr/bin/chromium";

        whatsappClient = new Client({
            authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
            authTimeoutMs: 120000, // 120s
            puppeteer: {
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || defaultExecPath,
                args: [
                    "--no-sandbox", 
                    "--disable-setuid-sandbox", 
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--no-zygote",
                    "--no-first-run",
                    "--disable-extensions",
                    "--hide-scrollbars",
                    "--mute-audio",
                    "--disable-setuid-sandbox",
                    "--disable-site-isolation-trials",
                    "--disable-web-security",
                    "--font-render-hinting=none",
                    "--disable-blink-features=AutomationControlled"
                ],
                handleSIGINT: false,
                handleSIGTERM: false,
                handleSIGHUP: false,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            },
        });
        console.log("🛠️ WhatsApp Client created. Calling initialize()...");
    } catch (err) {
        console.error("💥 FATA ERROR during WhatsApp initialization:", err);
        whatsappStatus = "error";
        io.emit("whatsapp:status", { status: "error", error: err.message });
        return;
    }

    whatsappClient.on("qr", async (qr) => {
        whatsappStatus = "waiting_qr";
        qrCount++;
        console.log(`📱 QR Code generated (${qrCount}). Syncing to frontend...`);
        // Refresh watchdog on every new QR
        startWatchdog(io, prisma);
        
        try {
            const qrImage = await QRCode.toDataURL(qr, {
                margin: 2,
                scale: 8
            });
            currentQR = qrImage;
            io.emit("whatsapp:qr", qrImage);
        } catch (err) {
            console.error("Failed to generate QR image:", err);
            currentQR = qr;
            io.emit("whatsapp:qr", qr); 
        }
    });

    whatsappClient.on("loading_screen", (percent, message) => {
        console.log(`⏳ Loading WhatsApp: ${percent}% - ${message}`);
        io.emit("whatsapp:status", { status: "loading", percent, message });
    });

    whatsappClient.on("ready", () => {
        whatsappStatus = "connected";
        currentQR = null;
        stopWatchdog(); // Success!
        console.log("✅ WhatsApp client is ready and fully synced!");
        io.emit("whatsapp:ready");
        io.emit("whatsapp:status", { status: "connected" });
    });

    whatsappClient.on("authenticated", () => {
        whatsappStatus = "authenticated";
        console.log("🔐 WhatsApp authentication successful.");
        io.emit("whatsapp:authenticated");
    });

    whatsappClient.on("auth_failure", (msg) => {
        whatsappStatus = "auth_failure";
        console.error("❌ WhatsApp auth failure:", msg);
        io.emit("whatsapp:auth_failure", msg);
        io.emit("whatsapp:status", { status: "auth_failure", error: msg });
    });

    whatsappClient.on("disconnected", (reason) => {
        whatsappStatus = "disconnected";
        console.log("🔌 WhatsApp disconnected:", reason);
        io.emit("whatsapp:disconnected", reason);
    });

    whatsappClient.on("message_ack", async (msg, ack) => {
        try {
            const statusMap = {
                1: "SENT",
                2: "DELIVERED",
                3: "READ",
            };
            const status = statusMap[ack];
            if (status) {
                const message = await prisma.message.update({
                    where: { whatsappId: msg.id.id },
                    data: { status },
                });
                io.emit("message:status", { 
                    messageId: message.id, 
                    whatsappId: msg.id.id, 
                    status 
                });
                console.log(`⏱️  Message ${msg.id.id} ack: ${status}`);
            }
        } catch (err) {
            // Silently fail if message not found in DB
        }
    });

    whatsappClient.on("message", async (msg) => {
        try {
            const contact = await msg.getContact();
            const phone = msg.from.replace("@c.us", "");
            const contactName = contact.pushname || contact.name || phone;

            console.log(`📩 Message from ${contactName} (${phone}): ${msg.body}`);

            let lead = await prisma.lead.findUnique({ where: { phone } });

            if (!lead) {
                const defaultStage = await prisma.stage.findFirst({
                    orderBy: { order: "asc" },
                });

                if (!defaultStage) {
                    console.warn("⚠️ No stages found. Cannot create lead.");
                    return;
                }

                lead = await prisma.lead.create({
                    data: {
                        name: contactName,
                        phone,
                        stageId: defaultStage.id,
                    },
                });

                io.emit("lead:created", lead);
                console.log(`🆕 New lead created: ${contactName}`);
            }

            let mediaData = {};
            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        const fileName = `${Date.now()}_${msg.id.id}.${media.mimetype.split("/")[1].split(";")[0]}`;
                        const filePath = path.join(__dirname, "..", "..", "uploads", fileName);
                        fs.writeFileSync(filePath, media.data, { encoding: "base64" });
                        
                        mediaData = {
                            type: media.mimetype.split("/")[0],
                            mediaUrl: `/uploads/${fileName}`,
                            mimeType: media.mimetype
                        };
                        console.log(`📂 Media saved: ${fileName} (Type: ${mediaData.type})`);
                    }
                } catch (err) {
                    console.error("❌ Failed to download media:", err.message);
                }
            }

            const message = await prisma.message.create({
                data: {
                    whatsappId: msg.id.id,
                    content: msg.body || null,
                    isFromMe: false,
                    leadId: lead.id,
                    status: "READ", // Incoming messages are considered READ by default for CRM logic
                    ...mediaData
                },
            });

            io.emit("message:received", { ...message, lead });

            // Native OpenAI Agent Integration
            if (lead.isAgentActive) {
                const config = await prisma.globalConfig.findUnique({ where: { id: "singleton" } });
                if (config && config.openAiApiKey) {
                    try {
                        console.log(`🤖 Processando IA para o lead ${lead.name}...`);
                        const { OpenAI } = require('openai');
                        const openai = new OpenAI({ apiKey: config.openAiApiKey });
                        
                        let userText = msg.body || "";

                        // Handle Audio via Whisper
                        if (mediaData.type === "audio" && mediaData.mediaUrl) {
                            console.log("🎤 Transcrevendo áudio recebido...");
                            const audioFilePath = path.join(__dirname, "..", "..", mediaData.mediaUrl);
                            
                            const transcription = await openai.audio.transcriptions.create({
                              file: fs.createReadStream(audioFilePath),
                              model: "whisper-1",
                            });
                            userText = transcription.text;
                            console.log("🎙️ Texto transcrito:", userText);
                        } else if (mediaData.type === "image" || mediaData.type === "document" || mediaData.type === "application") {
                            userText = `[O usuário enviou uma mídia do tipo ${mediaData.type}. Avise que você não consegue analisar imagens ou pdfs e que um humano irá analisar assim que possível.]`;
                        }

                        if (!userText.trim()) {
                             console.log("⚠️ Mensagem de IA abortada por falta de texto.");
                        } else {
                            // Fetch last 15 messages for context
                            const history = await prisma.message.findMany({
                                where: { leadId: lead.id },
                                orderBy: { timestamp: 'desc' },
                                take: 15
                            });
                            
                            history.reverse();
                            
                            const messagesContext = [];
                            messagesContext.push({
                                role: "system",
                                content: config.systemPrompt && config.systemPrompt.trim() !== "" 
                                    ? config.systemPrompt 
                                    : "Você é um assistente virtual focado em vendas. Responda de forma curta e direta."
                            });
                            
                            for (const m of history) {
                                // Exclude the message we JUST saved to avoid sending it twice (once as history, once as current)
                                if (m.id === message.id) continue;
                                messagesContext.push({
                                    role: m.isFromMe ? "assistant" : "user",
                                    content: m.content || "[Mídia não textual]"
                                });
                            }
                            
                            messagesContext.push({ role: "user", content: userText });
                            
                            console.log("🧠 Gerando resposta com gpt-4o-mini...");
                            const completion = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: messagesContext,
                            });
                            
                            const aiResponse = completion.choices[0].message.content;
                            console.log("💬 Resposta IA pronta!");
                            
                            // Send via Whatsapp directly
                            const responseWhatsappId = await sendMessage(lead.phone, aiResponse);
                            
                            // Save Assistant msg to CRM DB
                            const botMessage = await prisma.message.create({
                                data: {
                                    content: aiResponse,
                                    isFromMe: true,
                                    leadId: lead.id,
                                    whatsappId: responseWhatsappId
                                }
                            });
                            
                            // Notify frontend
                            io.emit("message:sent", { ...botMessage, lead });
                        }
                    } catch (iaErr) {
                        console.error("❌ Falha na Integração de IA Nativa:", iaErr.message);
                    }
                }
            }
        } catch (error) {
            console.error("Error processing incoming message:", error);
        }
    });

    whatsappStatus = "initializing";
    console.log("⏳ Initializing WhatsApp client...");
    io.emit("whatsapp:status", { status: "initializing" });

    // Status Heartbeat (every 30 seconds)
    if (statusHeartbeat) clearInterval(statusHeartbeat);
    statusHeartbeat = setInterval(() => {
        if (whatsappClient) {
            io.emit("whatsapp:status", getWhatsAppStatus());
        }
    }, 30000);
    
    const initTimeout = setTimeout(() => {
        if (whatsappStatus === "initializing") {
            console.error("❌ WhatsApp initialization timed out after 60s");
            whatsappStatus = "disconnected";
            io.emit("whatsapp:status", { status: "disconnected", error: "Timeout during initialization" });
        }
    }, 60000);

    whatsappClient.initialize()
        .then(() => {
            clearTimeout(initTimeout);
            console.log("🚀 WhatsApp client.initialize() call returned (Promised resolved)");
        })
        .catch(err => {
            clearTimeout(initTimeout);
            console.error("❌ Failed to initialize WhatsApp client:", err);
            whatsappStatus = "disconnected";
            lastError = err.message;
            io.emit("whatsapp:error", err.message);
            io.emit("whatsapp:status", { status: "disconnected", error: err.message });
        });
}

async function sendMessage(phone, text, mediaPath = null) {
    if (!whatsappClient || (whatsappStatus !== "connected" && whatsappStatus !== "authenticated")) {
        throw new Error(`WhatsApp is not connected (Status: ${whatsappStatus})`);
    }
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`;
    
    try {
        let response;
        
        // Wrap sending in a timeout to prevent hanging the whole request
        const sendTimeout = 30000; // 30 seconds
        const messagePromise = (async () => {
            if (mediaPath) {
                console.log(`📡 Sending media to ${chatId}: ${mediaPath}`);
                const media = MessageMedia.fromFilePath(mediaPath);
                
                // Check if it's an audio file to send as voice note (PTT)
                const isAudio = media.mimetype.startsWith('audio/');
                
                return await whatsappClient.sendMessage(chatId, media, { 
                    caption: text,
                    sendAudioAsVoice: isAudio
                });
            } else {
                console.log(`📡 Sending message to ${chatId}...`);
                return await whatsappClient.sendMessage(chatId, text);
            }
        })();

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout: WhatsApp timed out after ${sendTimeout/1000}s while sending to ${chatId}`)), sendTimeout);
        });

        response = await Promise.race([messagePromise, timeoutPromise]);
        
        console.log(`✅ Message sent to ${chatId} (${response.id.id})`);
        return response.id.id; // Return WhatsApp ID
    } catch (err) {
        console.error(`❌ whatsappClient.sendMessage failed for ${chatId}:`, err);
        throw err;
    }
}

function getWhatsAppStatus() {
    return { status: whatsappStatus, qr: currentQR, qrCount, error: lastError };
}

async function getWhatsAppDebug() {
    if (!whatsappClient || !whatsappClient.pupPage) {
        return { message: "Client not initialized or page not available", status: whatsappStatus };
    }
    
    try {
        const screenshot = await whatsappClient.pupPage.screenshot({ encoding: "base64" });
        const content = await whatsappClient.pupPage.content();
        return {
            status: whatsappStatus,
            qrCount,
            screenshot: `data:image/png;base64,${screenshot}`,
            hasContent: content.length > 0,
            url: whatsappClient.pupPage.url()
        };
    } catch (err) {
        return { error: err.message, status: whatsappStatus };
    }
}

async function disconnectWhatsApp() {
    if (whatsappClient) {
        console.log("⚠️ Desconectando WhatsApp...");
        try {
            await whatsappClient.logout();
        } catch (err) {
            console.error("Error during logout:", err);
        }
        try {
            await whatsappClient.destroy();
        } catch (err) {
            console.error("Error during destroy:", err);
        }
        whatsappClient = null;
    }
    whatsappStatus = "disconnected";
    const { getIO } = require('./socket');
    getIO().emit("whatsapp:status", { status: "disconnected" });
}

async function resetWhatsAppSession() {
    await disconnectWhatsApp();
    const authPath = path.join(process.cwd(), ".wwebjs_auth");
    console.log(`🧨 TOTAL RESET: Deleting ${authPath}...`);
    if (fs.existsSync(authPath)) {
        try {
            // Check if rimraf or similar is needed, but fs.rmSync is available in modern Node
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log("✅ Authenticator folder deleted.");
        } catch (e) {
            console.error("❌ Failed to delete auth folder:", e.message);
        }
    }
}

module.exports = { initWhatsApp, sendMessage, getWhatsAppStatus, getWhatsAppDebug, disconnectWhatsApp, resetWhatsAppSession };
