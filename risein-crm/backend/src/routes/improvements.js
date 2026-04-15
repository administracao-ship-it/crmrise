const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../uploads/improvements");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET all improvements
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

// POST create improvement (multipart)
router.post("/", upload.single("image"), async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ error: "title is required" });

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/improvements/${req.file.filename}`;
        }

        const item = await req.prisma.improvementPoint.create({
            data: { title, description: description || null, imageUrl, status: "Pendente" },
        });
        res.status(201).json(item);
    } catch (err) {
        next(err);
    }
});

// PATCH update status
router.patch("/:id", async (req, res, next) => {
    try {
        const { status, archived } = req.body;
        const data = {};
        if (status !== undefined) data.status = status;
        if (archived !== undefined) data.archived = archived;

        const item = await req.prisma.improvementPoint.update({
            where: { id: req.params.id },
            data,
        });
        res.json(item);
    } catch (err) {
        next(err);
    }
});

// DELETE
router.delete("/:id", async (req, res, next) => {
    try {
        const item = await req.prisma.improvementPoint.findUnique({ where: { id: req.params.id } });
        if (item?.imageUrl) {
            const filePath = path.join(__dirname, "../../", item.imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await req.prisma.improvementPoint.delete({ where: { id: req.params.id } });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
