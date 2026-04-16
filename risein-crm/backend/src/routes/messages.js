const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { 
    sendMessage, 
    getWhatsAppStatus, 
    getWhatsAppDebug, 
    initWhatsApp, 
    resetWhatsAppSession, 
    syncMessageMedia 
} = require("../services/whatsapp");

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

/**
 * MANUAL MEDIA SYNC
 * Downloads media for a specific message on demand.
 */
router.post("/:messageId/sync-media", async (req, res) => {
    try {
        const message = await syncMessageMedia(req.params.messageId, req.prisma, req.io);
        res.json(message);
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

        // Save message to DB immediately (before WhatsApp attempt)
        let whatsappId = null;
        let whatsappError = null;

        const message = await req.prisma.message.create({
            data: {
                content: content || null,
                isFromMe: true,
                leadId: lead.id,
                status: "sending",
                ...mediaData,
            },
        });

        // Attempt to send via WhatsApp
        try {
            whatsappId = await sendMessage(lead.phone, content || "", mediaPath);
            // Update with actual WhatsApp ID and mark as sent
            await req.prisma.message.update({
                where: { id: message.id },
                data: { whatsappId, status: "sent" },
            });
        } catch (waErr) {
            whatsappError = waErr.message;
            console.error(`[WARN] WhatsApp delivery failed for lead ${lead.id}:`, waErr.message);
            // Update status to reflect failed delivery
            await req.prisma.message.update({
                where: { id: message.id },
                data: { status: "failed" },
            }).catch(() => {}); // non-blocking
        }

        const finalMessage = { ...message, whatsappId, status: whatsappError ? "failed" : "sent" };
        req.io.emit("message:sent", { ...finalMessage, lead });

        if (whatsappError) {
            return res.status(202).json({
                ...finalMessage,
                warning: `Mensagem salva, mas WhatsApp offline: ${whatsappError}`,
            });
        }

        res.status(201).json(finalMessage);
    } catch (err) {
        console.error(`[ERROR] Failed to process message for lead ${req.params.leadId}:`, err);
        res.status(500).json({ error: "Failed to send message", details: err.message });
    }
});

router.get("/whatsapp/bulk/history", async (req, res, next) => {

    try {
        const jobs = await req.prisma.bulkJob.findMany({
            orderBy: { createdAt: "desc" },
            take: 20
        });
        res.json(jobs);
    } catch (err) {
        next(err);
    }
});

router.post("/whatsapp/media-upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }
        res.json({ 
            mediaUrl: `/uploads/${req.file.filename}`,
            mimeType: req.file.mimetype,
            filename: req.file.originalname 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/whatsapp/bulk", async (req, res) => {
    try {
        const { contacts, message, mediaUrl, delayMin = 10, delayMax = 25 } = req.body;
        
        if (!contacts || !Array.isArray(contacts) || !message) {
            return res.status(400).json({ error: "Contatos ou mensagem inválidos" });
        }

        const bulkJob = await req.prisma.bulkJob.create({
            data: {
                message,
                mediaUrl: mediaUrl || null,
                totalContacts: contacts.length,
                status: "RUNNING"
            }
        });

        res.json({ success: true, jobId: bulkJob.id, message: "Disparos iniciados" });

        (async () => {
            const defaultStage = await req.prisma.stage.findFirst({ orderBy: { order: "asc" } });
            let successes = 0;
            let errors = 0;
            
            let absoluteMediaPath = null;
            if (mediaUrl) {
                absoluteMediaPath = path.join(__dirname, "../../", mediaUrl);
            }

            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                const phone = contact.phone.replace(/\D/g, ""); 
                const personalizedMessage = message.replace(/{nome}/gi, contact.name);

                try {
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

                    const whatsappId = await sendMessage(phone, personalizedMessage, absoluteMediaPath);

                    const newMessage = await req.prisma.message.create({
                        data: {
                            content: personalizedMessage,
                            isFromMe: true,
                            leadId: lead.id,
                            whatsappId,
                            status: "SENT",
                            mediaUrl: mediaUrl || null,
                            type: mediaUrl ? "image" : "text"
                        }
                    });

                    successes++;
                    req.io.emit("message:sent", { ...newMessage, lead });
                    req.io.emit("bulk:progress", { index: i + 1, total: contacts.length, contact, status: "success", jobId: bulkJob.id });

                } catch (err) {
                    errors++;
                    console.error(`[BULK] Error sending to ${contact.name}:`, err.message);
                    req.io.emit("bulk:progress", { index: i + 1, total: contacts.length, contact, status: "error", error: err.message, jobId: bulkJob.id });
                }

                if (i % 5 === 0 || i === contacts.length - 1) {
                    await req.prisma.bulkJob.update({
                        where: { id: bulkJob.id },
                        data: {
                            processedCount: i + 1,
                            successCount: successes,
                            errorCount: errors
                        }
                    });
                }

                if (i < contacts.length - 1) {
                    const delay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            await req.prisma.bulkJob.update({
                where: { id: bulkJob.id },
                data: {
                    status: "COMPLETED",
                    processedCount: contacts.length,
                    successCount: successes,
                    errorCount: errors
                }
            });

            req.io.emit("bulk:completed", { total: contacts.length, success: successes, error: errors, jobId: bulkJob.id });
        })();

    } catch (err) {
        console.error("[BULK] Critical error:", err);
        res.status(500).json({ error: "Erro interno ao iniciar disparos" });
    }
});

module.exports = router;
