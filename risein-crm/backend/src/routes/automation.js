const express = require("express");
const router = express.Router();

// GET all rules
router.get("/", async (req, res, next) => {
    try {
        const rules = await req.prisma.automationRule.findMany({
            orderBy: { createdAt: "desc" }
        });
        res.json(rules);
    } catch (err) {
        next(err);
    }
});

// GET unique rule
router.get("/:id", async (req, res, next) => {
    try {
        const rule = await req.prisma.automationRule.findUnique({
            where: { id: req.params.id }
        });
        if (!rule) return res.status(404).json({ error: "Rule not found" });
        res.json(rule);
    } catch (err) {
        next(err);
    }
});

// CREATE/UPDATE rule
router.post("/", async (req, res, next) => {
    try {
        const { id, name, description, triggerType, triggerId, nodes, edges, isActive } = req.body;
        
        const data = {
            name,
            description,
            triggerType,
            triggerId,
            nodes: typeof nodes === 'string' ? nodes : JSON.stringify(nodes),
            edges: typeof edges === 'string' ? edges : JSON.stringify(edges),
            isActive: isActive !== undefined ? isActive : true
        };

        let rule;
        if (id) {
            rule = await req.prisma.automationRule.update({
                where: { id },
                data
            });
        } else {
            rule = await req.prisma.automationRule.create({
                data
            });
        }
        
        res.status(id ? 200 : 201).json(rule);
    } catch (err) {
        next(err);
    }
});

// DELETE rule
router.delete("/:id", async (req, res, next) => {
    try {
        await req.prisma.automationRule.delete({
            where: { id: req.params.id }
        });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

// TOGGLE active/inactive
router.patch("/:id/toggle", async (req, res, next) => {
    try {
        const rule = await req.prisma.automationRule.findUnique({
            where: { id: req.params.id }
        });
        if (!rule) return res.status(404).json({ error: "Rule not found" });

        const updated = await req.prisma.automationRule.update({
            where: { id: req.params.id },
            data: { isActive: !rule.isActive }
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
