const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "rise-crm-secret-key-2025";

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await req.prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user || !user.active) {
            return res.status(401).json({ error: "Invalid user or inactive account" });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "ADMIN") {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin role required." });
    }
};

module.exports = { authMiddleware, isAdmin, JWT_SECRET };
