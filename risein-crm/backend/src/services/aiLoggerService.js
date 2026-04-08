const { PrismaClient } = require("@prisma/client");

class AiLoggerService {
    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Log a specific AI action for metrics.
     * @param {string} eventType - The type of event (e.g., CHAT_STARTED, CONVERTED_VISIT, FOLLOWUP_MOVED, NO_CONTACT)
     * @param {string|null} leadId - The ID of the lead
     * @param {string|null} details - Any additional JSON string details
     */
    async logEvent(eventType, leadId = null, details = null) {
        try {
            await this.prisma.aiMetricEvent.create({
                data: {
                    eventType,
                    leadId,
                    details
                }
            });
            console.log(`[AI Event] Logged ${eventType} for lead ${leadId}`);
        } catch (error) {
            console.error(`[AI Event ERROR] Failed to log ${eventType}:`, error);
        }
    }
}

module.exports = new AiLoggerService();
