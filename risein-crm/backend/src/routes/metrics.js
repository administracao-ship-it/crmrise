const express = require("express");
const router = express.Router();

router.get("/ai", async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();

        // 1. Total AI Messages in period
        const totalAiMessages = await req.prisma.message.count({
            where: {
                fromAi: true,
                timestamp: {
                    gte: start,
                    lte: end
                }
            }
        });

        // 2. Total Unique Leads served by AI in period
        const leadsServed = await req.prisma.lead.count({
            where: {
                aiServedAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // 3. Human Messages in same period (for comparison)
        const humanMessages = await req.prisma.message.count({
            where: {
                isFromMe: true,
                fromAi: false,
                timestamp: {
                    gte: start,
                    lte: end
                }
            }
        });

        // 4. Daily progression (for charts)
        // Note: SQLite doesn't have great date grouping, so we'll do it in JS or raw query
        // For simplicity and compatibility, taking all AI messages in period and grouping here
        const messages = await req.prisma.message.findMany({
            where: {
                fromAi: true,
                timestamp: {
                    gte: start,
                    lte: end
                }
            },
            select: { timestamp: true }
        });

        const dailyData = {};
        messages.forEach(m => {
            const date = m.timestamp.toISOString().split('T')[0];
            dailyData[date] = (dailyData[date] || 0) + 1;
        });

        // 5. "Success" Proxy: Leads served by AI that are NOT in the first stage anymore
        // (Assuming first stage is where new leads arrive)
        const firstStage = await req.prisma.stage.findFirst({ orderBy: { order: 'asc' } });
        const convertedLeads = await req.prisma.lead.count({
            where: {
                aiServedAt: {
                    gte: start,
                    lte: end
                },
                stageId: {
                    not: firstStage?.id
                }
            }
        });

        res.json({
            summary: {
                totalAiMessages,
                leadsServed,
                humanMessages,
                convertedLeads,
                efficiency: leadsServed > 0 ? ((convertedLeads / leadsServed) * 100).toFixed(1) : 0
            },
            chartData: Object.entries(dailyData).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date))
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;
