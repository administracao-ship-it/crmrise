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

module.exports = router;
