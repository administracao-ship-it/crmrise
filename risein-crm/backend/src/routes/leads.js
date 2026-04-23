const express = require("express");
const router = express.Router();
const automationService = require("../services/automationService");
const whatsappService = require("../services/whatsapp");

router.get("/", async (req, res, next) => {
    try {
        const leads = await req.prisma.lead.findMany({
            include: { 
                stage: true, 
                tags: true,
                messages: { take: 1, orderBy: { timestamp: "desc" } } 
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(leads);
    } catch (err) {
        next(err);
    }
});

router.get("/:id", async (req, res, next) => {
    try {
        const lead = await req.prisma.lead.findUnique({
            where: { id: req.params.id },
            include: { 
                stage: true, 
                tags: true,
                messages: { orderBy: { timestamp: "asc" } } 
            },
        });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        res.json(lead);
    } catch (err) {
        next(err);
    }
});

router.post("/", async (req, res, next) => {
    try {
        const { name, phone, value, stageId, userId, title, phase, city, closedAt } = req.body;
        const lead = await req.prisma.lead.create({
            data: { 
                name, 
                phone, 
                value: value || 0, 
                stageId, 
                userId,
                title,
                phase,
                city,
                ...(closedAt && { closedAt: new Date(closedAt) })
            },
            include: { stage: true, tags: true },
        });
        req.io.emit("lead:created", lead);
        
        // Trigger Automation: NEW_LEAD
        // Using setImmediate or wrapping in try-catch to not block response
        setImmediate(() => automationService.trigger("NEW_LEAD", lead.id));

        res.status(201).json(lead);
    } catch (err) {
        next(err);
    }
});

router.patch("/:id", async (req, res, next) => {
    try {
        const { 
            name, phone, value, stageId, userId, title, phase, city, closedAt, isAgentActive, tags,
            responsible, forecast, origin, instagram, designer, campaign, notes, service,
            intent_value, search_prime, presentation, agency, rise_no, company, email_work, position, user_terms
        } = req.body;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (value !== undefined && value !== null) updateData.value = Number(value) || 0;
        if (stageId !== undefined) updateData.stageId = stageId;
        if (userId !== undefined) updateData.userId = userId;
        if (title !== undefined) updateData.title = title;
        if (phase !== undefined) updateData.phase = phase;
        if (city !== undefined) updateData.city = city;
        if (closedAt !== undefined) updateData.closedAt = closedAt ? new Date(closedAt) : null;
        if (isAgentActive !== undefined) updateData.isAgentActive = Boolean(isAgentActive);
        
        // New CRM fields
        if (responsible !== undefined) updateData.responsible = responsible;
        if (forecast !== undefined) updateData.forecast = forecast ? new Date(forecast) : null;
        if (origin !== undefined) updateData.origin = origin;
        if (instagram !== undefined) updateData.instagram = instagram;
        if (designer !== undefined) updateData.designer = designer;
        if (campaign !== undefined) updateData.campaign = campaign;
        if (notes !== undefined) updateData.notes = notes;
        if (service !== undefined) updateData.service = service;
        if (intent_value !== undefined) updateData.intent_value = intent_value;
        if (search_prime !== undefined) updateData.search_prime = search_prime;
        if (presentation !== undefined) updateData.presentation = presentation ? new Date(presentation) : null;
        if (agency !== undefined) updateData.agency = agency;
        if (rise_no !== undefined) updateData.rise_no = rise_no;
        if (company !== undefined) updateData.company = company;
        if (email_work !== undefined) updateData.email_work = email_work;
        if (position !== undefined) updateData.position = position;
        if (user_terms !== undefined) updateData.user_terms = Boolean(user_terms);

        const lead = await req.prisma.lead.update({
            where: { id: req.params.id },
            data: updateData,
            include: { stage: true, tags: true },
        });
        req.io.emit("lead:updated", lead);

        // Trigger Automation: STAGE_CHANGE
        if (req.body.stageId) {
            setImmediate(() => automationService.trigger("STAGE_CHANGE", lead.id, { triggerId: req.body.stageId }));
        }

        res.json(lead);
    } catch (err) {
        next(err);
    }
});

router.delete("/:id", async (req, res, next) => {
    try {
        await req.prisma.message.deleteMany({ where: { leadId: req.params.id } });
        await req.prisma.lead.delete({ where: { id: req.params.id } });
        req.io.emit("lead:deleted", req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

router.post("/:id/avatar", async (req, res, next) => {
    try {
        const lead = await req.prisma.lead.findUnique({
            where: { id: req.params.id }
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });

        const avatarUrl = await whatsappService.getProfilePicUrl(lead.phone);
        
        const updatedLead = await req.prisma.lead.update({
            where: { id: lead.id },
            data: { avatarUrl },
            include: { stage: true, tags: true }
        });

        req.io.emit("lead:updated", updatedLead);
        res.json(updatedLead);
    } catch (err) {
        next(err);
    }
});

router.post("/sync-avatars", async (req, res, next) => {
    try {
        const leads = await req.prisma.lead.findMany({
            where: {
                OR: [
                    { avatarUrl: null },
                    { avatarUrl: "" }
                ]
            }
        });

        if (leads.length === 0) return res.json({ message: "No leads need avatar sync", count: 0 });

        // Process in background to avoid timeout
        setImmediate(async () => {
            console.log(`📸 Starting background avatar sync for ${leads.length} leads...`);
            for (const lead of leads) {
                try {
                    const avatarUrl = await whatsappService.getProfilePicUrl(lead.phone);
                    if (avatarUrl) {
                        const updated = await req.prisma.lead.update({
                            where: { id: lead.id },
                            data: { avatarUrl }
                        });
                        req.io.emit("lead:updated", updated);
                    }
                    // Wait a bit between calls to avoid WhatsApp rate limits
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    console.warn(`Failed to sync avatar for ${lead.name}:`, e.message);
                }
            }
            console.log("✅ Background avatar sync completed.");
        });

        res.json({ message: `Sync started in background for ${leads.length} leads`, count: leads.length });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
