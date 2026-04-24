const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authMiddleware, JWT_SECRET } = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
    try {
        let { email, password } = req.body;
        
        // Alias for the main admin account
        if (email === "rise") {
            email = "admin@rise.com";
        }

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await req.prisma.user.findUnique({
            where: { email }
        });

        if (!user || !user.active) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me
router.get("/me", authMiddleware, (req, res) => {
    const { id, name, email, role } = req.user;
    res.json({ id, name, email, role });
});

module.exports = router;
