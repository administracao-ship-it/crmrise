const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

let whatsappClient = null;
let whatsappStatus = "disconnected";
let currentQR = null;
let lastError = null;
let statusHeartbeat = null;

function cleanSingletonLock(baseDir) {
    if (!fs.existsSync(baseDir)) return;
    try {
        const pathsToClean = [
            path.join(baseDir, "SingletonLock"),
            path.join(baseDir, "LOCK"),
            path.join(baseDir, "Default", "SingletonLock"),
            path.join(baseDir, "Default", "LOCK"),
            path.join(baseDir, "session", "SingletonLock"),
            path.join(baseDir, "session", "LOCK"),
            path.join(baseDir, "session", "Default", "SingletonLock"),
            path.join(baseDir, "session", "Default", "LOCK")
        ];

        pathsToClean.forEach(lockPath => {
            if (fs.existsSync(lockPath)) {
                try {
                    fs.unlinkSync(lockPath);
                    console.log(`✅ Removed stale lock: ${lockPath}`);
                } catch (e) {
                    console.warn(`⚠️ Could not remove lock at ${lockPath}:`, e.message);
                }
            }
        });
    } catch (err) {
        console.warn("⚠️ Non-critical error during lock cleanup:", err.message);
    }
}

function initWhatsApp(io, prisma) {
    console.log("🚀 Starting WhatsApp Service...");
    whatsappStatus = "initializing";
    io.emit("whatsapp:status", { status: "initializing" });
    
    try {
        if (whatsappClient) {
            console.log("♻️  Cleaning up previous instance...");
            whatsappClient.destroy().catch(() => {});
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
                    "--mute-audio"
                ],
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
        // qrcodeTerminal.generate(qr, { small: true });
        console.log("📱 QR Code generated. Syncing to frontend...");
        
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
        .then(() => clearTimeout(initTimeout))
        .catch(err => {
            clearTimeout(initTimeout);
            console.error("❌ Failed to initialize WhatsApp client:", err);
            whatsappStatus = "disconnected";
            lastError = err.message;
            io.emit("whatsapp:error", err.message);
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
    return { status: whatsappStatus, qr: currentQR, error: lastError };
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
    getIO().emit("whatsapp:disconnected");
}

module.exports = { initWhatsApp, sendMessage, getWhatsAppStatus, disconnectWhatsApp };
