const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/authMiddleware");

// GET /api/config
router.get("/", async (req, res, next) => {
    try {
        let config = await req.prisma.globalConfig.findUnique({
            where: { id: "singleton" },
        });

        if (!config) {
            // Seed if somehow missing
            config = await req.prisma.globalConfig.create({
                data: { id: "singleton", funnelName: "CRM RISE" },
            });
        }

        res.json(config);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/config
router.patch("/", async (req, res, next) => {
    try {
        const { funnelName, openAiApiKey, systemPrompt, humanTakeoverMessage, aiTriggerMessages, isAiActive } = req.body;
        
        // Finer-grained protection: Only Admins can change AI keys and Prompts
        if (req.user.role !== "ADMIN") {
            if (openAiApiKey || systemPrompt || aiTriggerMessages || isAiActive !== undefined) {
                return res.status(403).json({ error: "Apenas administradores podem alterar configurações de IA" });
            }
        }

        const updateData = {};
        if (funnelName !== undefined) updateData.funnelName = funnelName;
        if (openAiApiKey !== undefined) updateData.openAiApiKey = openAiApiKey;
        if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
        if (humanTakeoverMessage !== undefined) updateData.humanTakeoverMessage = humanTakeoverMessage;
        if (aiTriggerMessages !== undefined) updateData.aiTriggerMessages = aiTriggerMessages;
        if (isAiActive !== undefined) updateData.isAiActive = isAiActive;

        const config = await req.prisma.globalConfig.upsert({
            where: { id: "singleton" },
            update: updateData,
            create: { id: "singleton", ...updateData, funnelName: updateData.funnelName || "CRM RISE" },
        });
        res.json(config);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
