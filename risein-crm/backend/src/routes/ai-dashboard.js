const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { prisma } = req;
        const { startDate, endDate } = req.query;

        console.log(`[AI Dashboard] Fetching metrics from ${startDate} to ${endDate}`);

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.lte = end;
            }
        }

        // Fetch all matching events
        const events = await prisma.aiMetricEvent.findMany({
            where: dateFilter,
            orderBy: { createdAt: "asc" }
        });

        // Calculate KPI totals
        let totalChats = 0;
        let totalConverted = 0;
        let totalFollowUp = 0;
        let totalNoContact = 0;

        // Group by day for the chart
        const chartDataMap = {};

        events.forEach(event => {
            // Count KPIs
            if (event.eventType === "CHAT_STARTED") totalChats++;
            else if (event.eventType === "CONVERTED_VISIT") totalConverted++;
            else if (event.eventType === "FOLLOWUP_MOVED") totalFollowUp++;
            else if (event.eventType === "NO_CONTACT") totalNoContact++;

            // Create chart data grouped by YYYY-MM-DD
            const dateObj = new Date(event.createdAt);
            const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

            if (!chartDataMap[dateStr]) {
                chartDataMap[dateStr] = { 
                    name: formattedDate,
                    sortKey: dateStr,
                    atendimentos: 0, 
                    conversoes: 0 
                };
            }

            if (event.eventType === "CHAT_STARTED") {
                chartDataMap[dateStr].atendimentos += 1;
            } else if (event.eventType === "CONVERTED_VISIT") {
                chartDataMap[dateStr].conversoes += 1;
            }
        });

        // Sort chart data chronologically
        const chartData = Object.values(chartDataMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        res.json({
            kpi: {
                totalChats,
                totalConverted,
                totalFollowUp,
                totalNoContact,
                conversionRate: totalChats > 0 ? ((totalConverted / totalChats) * 100).toFixed(1) : "0.0"
            },
            chartData
        });

    } catch (err) {
        console.error("[AI Dashboard Error]", err);
        res.status(500).json({ error: "Failed to fetch AI dashboard metrics" });
    }
});

module.exports = router;
