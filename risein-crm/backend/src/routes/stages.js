const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
    try {
        const stages = await req.prisma.stage.findMany({
            orderBy: { order: "asc" },
            include: {
                leads: {
                    include: {
                        messages: { take: 1, orderBy: { timestamp: "desc" } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        res.json(stages);
    } catch (err) {
        next(err);
    }
});

router.post("/", async (req, res, next) => {
    try {
        const { name, order } = req.body;
        const stage = await req.prisma.stage.create({
            data: { name, order: order || 0 },
        });
        res.status(201).json(stage);
    } catch (err) {
        next(err);
    }
});

router.patch("/:id", async (req, res, next) => {
    try {
        const { name, order } = req.body;
        const stage = await req.prisma.stage.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(order !== undefined && { order }),
            },
        });
        res.json(stage);
    } catch (err) {
        next(err);
    }
});

router.delete("/:id", async (req, res, next) => {
    try {
        const leadsCount = await req.prisma.lead.count({ where: { stageId: req.params.id } });
        if (leadsCount > 0) {
            return res.status(400).json({ error: "Cannot delete stage with existing leads" });
        }
        await req.prisma.stage.delete({ where: { id: req.params.id } });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
