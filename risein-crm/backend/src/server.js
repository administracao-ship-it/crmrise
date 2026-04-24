require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const leadRoutes = require("./routes/leads");
const stageRoutes = require("./routes/stages");
const messageRoutes = require("./routes/messages");
const configRoutes = require("./routes/config");
const { initWhatsApp, getWhatsAppStatus } = require("./services/whatsapp");
const automationService = require("./services/automationService");
const automationRoutes = require("./routes/automation");
const tagRoutes = require("./routes/tags");
const metricsRoutes = require("./routes/metrics");
const improvementsRoutes = require("./routes/improvements");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const { authMiddleware, isAdmin } = require("./middleware/authMiddleware");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    },
});

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

app.use((req, _res, next) => {
    req.prisma = prisma;
    req.io = io;
    next();
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/stages", stageRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/config", authMiddleware, configRoutes); // Auth required, roles handled inside
app.use("/api/automation", automationRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/improvements", improvementsRoutes);

app.use((err, _req, res, _next) => {
    console.error("[ERROR]", err.message);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
    console.log(`🚀 Rise In API running on http://localhost:${PORT}`);

    // Auto-seed stages and config if database is empty
    try {
        const stageCount = await prisma.stage.count();
        if (stageCount === 0) {
            console.log("🌱 Database empty. Seeding default stages...");
            const DEFAULT_STAGES = [
                { name: "NOVO LEAD", order: 0 },
                { name: "LEANDRO", order: 1 },
                { name: "FEZ CALCULO NO SITE", order: 2 },
                { name: "SOLICITOU ORÇAMENTO NO SITE", order: 3 },
                { name: "1° CONTATO - HUMANIZADO", order: 4 },
                { name: "2° CONTATO - HUMANIZADO", order: 5 },
            ];
            for (const stage of DEFAULT_STAGES) {
                await prisma.stage.create({ data: stage });
            }
            console.log("✅ Stage seeding complete.");
        }

        const configCount = await prisma.globalConfig.count();
        if (configCount === 0) {
            console.log("🌱 Seeding default global config...");
            await prisma.globalConfig.create({
                data: { id: "singleton", funnelName: "CRM RISE" }
            });
            console.log("✅ Config seeding complete.");
        }

        const userCount = await prisma.user.count();
        if (userCount === 0) {
            console.log("🌱 No users found. Creating initial admin...");
            const hashedPassword = await bcrypt.hash("leadqualificado", 10);
            await prisma.user.create({
                data: {
                    name: "Admin Rise",
                    email: "admin@rise.com",
                    password: hashedPassword,
                    role: "ADMIN"
                }
            });
            console.log("✅ Initial admin created: admin@rise.com / leadqualificado");
        }
    } catch (err) {
        console.error("⚠️ Failed to seed on startup:", err.message);
    }

    // WhatsApp is now initialized on startup (uses LocalAuth session)
    initWhatsApp(io, prisma);

    // Initialize Automation Service
    automationService.init(prisma, io);
});

io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Send current WhatsApp status on connection
    const status = getWhatsAppStatus();
    socket.emit("whatsapp:status", status);

    socket.on("disconnect", () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

module.exports = { app, server, io, prisma };
