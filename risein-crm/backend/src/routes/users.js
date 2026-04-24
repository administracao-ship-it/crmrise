const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

// All routes here require ADMIN role
router.use(authMiddleware);
router.use(isAdmin);

// GET /api/users - List all users
router.get("/", async (req, res, next) => {
    try {
        const users = await req.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" }
        });
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// POST /api/users - Create new user
router.post("/", async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email and password are required" });
        }

        const existingUser = await req.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await req.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "USER"
            }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/users/:id - Update user
router.patch("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, active } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (active !== undefined) updateData.active = active;
        
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await req.prisma.user.update({
            where: { id },
            data: updateData
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/users/:id - Delete user
router.delete("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }

        await req.prisma.user.delete({ where: { id } });
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
