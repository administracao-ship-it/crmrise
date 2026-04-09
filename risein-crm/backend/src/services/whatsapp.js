const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcodeTerminal = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

let whatsappClient = null;
let whatsappStatus = "disconnected";
let currentQR = null;
let lastError = null;

function cleanSingletonLock(dir) {
    if (!fs.existsSync(dir)) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                cleanSingletonLock(fullPath);
            } else if (file === "SingletonLock") {
                fs.unlinkSync(fullPath);
                console.log(`✅ Removed stale lock: ${fullPath}`);
            }
        }
    } catch (err) {
        // Silently fail if we can't delete it
    }
}

function initWhatsApp(io, prisma) {
    if (whatsappClient) {
        console.log("♻️  Restarting WhatsApp client...");
        whatsappClient.destroy();
    }

    // Clean any Chromium locks before starting
    cleanSingletonLock(path.join(process.cwd(), ".wwebjs_auth"));

    whatsappClient = new Client({
        authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
        authTimeoutMs: 60000,
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
            args: [
                "--no-sandbox", 
                "--disable-setuid-sandbox", 
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-zygote",
                "--single-process"
            ],
        },
    });

    whatsappClient.on("qr", async (qr) => {
        whatsappStatus = "waiting_qr";
        qrcodeTerminal.generate(qr, { small: true });
        console.log("📱 QR Code generated. Scan with your phone.");
        
        try {
            const QRCode = require("qrcode");
            const qrImage = await QRCode.toDataURL(qr);
            currentQR = qrImage; // Store the Data URL as the current QR
            io.emit("whatsapp:qr", qrImage);
        } catch (err) {
            console.error("Failed to generate QR image:", err);
            currentQR = qr; // Fallback to raw string
            io.emit("whatsapp:qr", qr); 
        }
    });

    whatsappClient.on("ready", () => {
        whatsappStatus = "connected";
        currentQR = null;
        console.log("✅ WhatsApp client is ready!");
        io.emit("whatsapp:ready");
    });

    whatsappClient.on("authenticated", () => {
        whatsappStatus = "authenticated";
        console.log("🔐 WhatsApp authenticated");
        io.emit("whatsapp:authenticated");
    });

    whatsappClient.on("auth_failure", (msg) => {
        whatsappStatus = "auth_failure";
        console.error("❌ WhatsApp auth failure:", msg);
        io.emit("whatsapp:auth_failure", msg);
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
