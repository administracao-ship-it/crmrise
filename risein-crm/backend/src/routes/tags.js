const express = require("express");
const router = express.Router();

// GET all tags
router.get("/", async (req, res, next) => {
    try {
        const tags = await req.prisma.tag.findMany({
            orderBy: { name: "asc" }
        });
        res.json(tags);
    } catch (err) {
        next(err);
    }
});

// CREATE tag
router.post("/", async (req, res, next) => {
    try {
        const { name, color } = req.body;
        const tag = await req.prisma.tag.create({
            data: { name, color }
        });
        res.status(201).json(tag);
    } catch (err) {
        next(err);
    }
});

// DELETE tag
router.delete("/:id", async (req, res, next) => {
    try {
        await req.prisma.tag.delete({
            where: { id: req.params.id }
        });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

// UPDATE tag
router.patch("/:id", async (req, res, next) => {
    try {
        const { name, color } = req.body;
        const tag = await req.prisma.tag.update({
            where: { id: req.params.id },
            data: { name, color }
        });
        res.json(tag);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
