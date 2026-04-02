require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function main() {
    console.log("🌱 Starting Seed Process...");
    const prisma = new PrismaClient();

    const DEFAULT_STAGES = [
        { name: "NOVO LEAD", order: 0 },
        { name: "LEANDRO", order: 1 },
        { name: "FEZ CALCULO NO SITE", order: 2 },
        { name: "SOLICITOU ORÇAMENTO NO SITE", order: 3 },
        { name: "1° CONTATO - HUMANIZADO", order: 4 },
        { name: "2° CONTATO - HUMANIZADO", order: 5 },
    ];

    try {
        const count = await prisma.stage.count();
        console.log(`📊 Current stage count: ${count}`);

        if (count === 0) {
            console.log("🌱 Creating default stages...");
            for (const stage of DEFAULT_STAGES) {
                await prisma.stage.create({ data: stage });
            }
            console.log("✅ Seeding complete.");
        } else {
            console.log("✅ Data already exists, skipping seed.");
        }
    } catch (err) {
        console.error("❌ Seed failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
