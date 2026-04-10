const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { sendMessage, getWhatsAppStatus, getWhatsAppDebug, initWhatsApp, resetWhatsAppSession } = require("../services/whatsapp");

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../uploads"));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});
const upload = multer({ storage });

router.get("/whatsapp/status", (_req, res) => {
    res.json(getWhatsAppStatus());
});

router.get("/whatsapp/debug", async (_req, res) => {
    try {
        const debugInfo = await getWhatsAppDebug();
        res.json(debugInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/whatsapp/connect", (req, res) => {
    try {
        initWhatsApp(req.io, req.prisma);
        res.json({ message: "WhatsApp initialization triggered" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/whatsapp/disconnect", async (req, res) => {
    try {
        const { disconnectWhatsApp } = require("../services/whatsapp");
        await disconnectWhatsApp();
        res.json({ message: "WhatsApp disconnected successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/whatsapp/reset", async (req, res) => {
    try {
        await resetWhatsAppSession();
        res.json({ message: "WhatsApp session reset and disconnected" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint for n8n to send messages BACK to the CRM
router.post("/webhook/n8n", async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: "Missing phone or message" });
        }

        const lead = await req.prisma.lead.findUnique({
            where: { phone },
        });

        if (!lead) {
            console.warn(`[N8N] Attemped to send message to unknown lead: ${phone}`);
            return res.status(404).json({ error: "Lead not found" });
        }

        const whatsappId = await sendMessage(phone, message);

        const newMessage = await req.prisma.message.create({
            data: {
                content: message,
                isFromMe: true,
                leadId: lead.id,
                whatsappId
            },
        });

        req.io.emit("message:sent", { ...newMessage, lead });
        res.status(200).json({ success: true, messageId: newMessage.id });
    } catch (err) {
        console.error("[N8N Webhook Error]:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

router.get("/:leadId", async (req, res, next) => {
    try {
        const messages = await req.prisma.message.findMany({
            where: { leadId: req.params.leadId },
            orderBy: { timestamp: "asc" },
        });
        res.json(messages);
    } catch (err) {
        next(err);
    }
});

router.post("/:leadId", upload.single("file"), async (req, res, next) => {
    try {
        const { content } = req.body;
        const file = req.file;
        const lead = await req.prisma.lead.findUnique({
            where: { id: req.params.leadId },
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });

        let mediaPath = null;
        let mediaData = {};

        if (file) {
            mediaPath = file.path;
            mediaData = {
                type: file.mimetype.split("/")[0],
                mediaUrl: `/uploads/${file.filename}`,
                mimeType: file.mimetype,
            };
        }

        const whatsappId = await sendMessage(lead.phone, content || "", mediaPath);

        let messageData = {
            content: content || null,
            isFromMe: true,
            leadId: lead.id,
            ...mediaData
        };

        let message;
        try {
            // Try with whatsappId first
            message = await req.prisma.message.create({
                data: {
                    ...messageData,
                    whatsappId
                },
            });
        } catch (prismaErr) {
            // Fallback: If whatsappId is unknown, try without it
            if (prismaErr.message.includes("Unknown argument `whatsappId`")) {
                console.warn("[PRISMA] whatsappId field not recognized by current client. Saving message without it. Run 'npx prisma generate' to fix.");
                message = await req.prisma.message.create({
                    data: messageData,
                });
            } else {
                throw prismaErr;
            }
        }

        req.io.emit("message:sent", { ...message, lead });
        res.status(201).json(message);
    } catch (err) {
        console.error(`[ERROR] Failed to send message to lead ${req.params.leadId}:`, err);
        // Deep inspection of the error object
        let details = "Unknown error";
        if (err && typeof err === 'object') {
            details = err.message || JSON.stringify(err);
        } else if (typeof err === 'string') {
            details = err;
        }
        res.status(500).json({ 
            error: "Failed to send message", 
            details: details,
            type: typeof err
        });
    }
});

router.post("/whatsapp/bulk", async (req, res) => {
    try {
        const { contacts, message, delayMin = 10, delayMax = 25 } = req.body;
        
        if (!contacts || !Array.isArray(contacts) || !message) {
            return res.status(400).json({ error: "Contatos ou mensagem inválidos" });
        }

        // Return immediately so the UI isn't blocked, processing happens in background
        res.json({ success: true, total: contacts.length, message: "Disparos iniciados" });

        // Run background process
        (async () => {
            const defaultStage = await req.prisma.stage.findFirst({ orderBy: { order: "asc" } });
            
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                const phone = contact.phone.replace(/\D/g, ""); // Keep only digits
                const personalizedMessage = message.replace(/{nome}/gi, contact.name);

                try {
                    // 1. Find or Create Lead
                    let lead = await req.prisma.lead.findUnique({ where: { phone } });
                    if (!lead) {
                        lead = await req.prisma.lead.create({
                            data: {
                                name: contact.name,
                                phone: phone,
                                stageId: defaultStage?.id || "default",
                                value: 0
                            }
                        });
                        req.io.emit("lead:created", lead);
                    }

                    // 2. Send Message
                    const whatsappId = await sendMessage(phone, personalizedMessage);

                    // 3. Save Message
                    const newMessage = await req.prisma.message.create({
                        data: {
                            content: personalizedMessage,
                            isFromMe: true,
                            leadId: lead.id,
                            whatsappId,
                            status: "SENT"
                        }
                    });

                    req.io.emit("message:sent", { ...newMessage, lead });
                    req.io.emit("bulk:progress", { index: i, total: contacts.length, contact, status: "success" });

                } catch (err) {
                    console.error(`[BULK] Error sending to ${contact.name}:`, err.message);
                    req.io.emit("bulk:progress", { index: i, total: contacts.length, contact, status: "error", error: err.message });
                }

                // 4. Anti-blocking delay (don't wait on the last one)
                if (i < contacts.length - 1) {
                    const delay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            req.io.emit("bulk:completed", { total: contacts.length });
        })();

    } catch (err) {
        console.error("[BULK] Critical error:", err);
        res.status(500).json({ error: "Erro interno ao iniciar disparos" });
    }
});

module.exports = router;
