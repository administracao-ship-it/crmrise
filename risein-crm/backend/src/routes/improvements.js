const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `improvement_${Date.now()}_${file.originalname}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/improvements
router.get("/", async (req, res, next) => {
    try {
        const items = await req.prisma.improvementPoint.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json(items);
    } catch (err) {
        next(err);
    }
});

// POST /api/improvements
router.post("/", upload.single("image"), async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title is required" });
        }

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const item = await req.prisma.improvementPoint.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                imageUrl,
                status: "Pendente",
            },
        });

        res.status(201).json(item);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/improvements/:id
router.patch("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, title, description } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;

        const item = await req.prisma.improvementPoint.update({
            where: { id },
            data: updateData,
        });

        res.json(item);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/improvements/:id
router.delete("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;

        const item = await req.prisma.improvementPoint.findUnique({ where: { id } });
        if (item && item.imageUrl) {
            const filePath = path.join(__dirname, "../../", item.imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await req.prisma.improvementPoint.delete({ where: { id } });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
