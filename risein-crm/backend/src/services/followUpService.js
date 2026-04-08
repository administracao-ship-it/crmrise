// Circular dependency handled by late require

class FollowUpService {
  constructor() {
    this.prisma = null;
    this.io = null;
    this.intervalId = null;
    this.stages = {}; // Map name to ID
  }

  async init(prisma, io) {
    this.prisma = prisma;
    this.io = io;
    
    // Load stages for quick access
    const allStages = await this.prisma.stage.findMany();
    allStages.forEach(s => {
      this.stages[s.name] = s.id;
    });

    this.startPolling();
    console.log("[FollowUpService] Initialized and Polling started");
  }

  startPolling() {
    if (this.intervalId) clearInterval(this.intervalId);
    // Check every 30 seconds
    this.intervalId = setInterval(() => this.processQueue(), 30000);
  }

  async processQueue() {
    try {
        const now = new Date();
        const followUps = await this.prisma.followUp.findMany({
            where: {
                isActive: true,
                nextActionAt: { lte: now }
            },
            include: { lead: true }
        });

        for (const fu of followUps) {
            await this.executeStep(fu);
        }
    } catch (err) {
        console.error("[FollowUpService] Error in processQueue:", err.message);
    }
  }

  async executeStep(fu) {
    const { lead, step } = fu;
    console.log(`[FollowUpService] Executing step ${step} for lead ${lead.name} (${lead.phone})`);
    
    // Late require to avoid circular dependency
    const { sendMessage } = require("./whatsapp");
    let nextStep = step + 1;
    let nextDelay = 60 * 60 * 1000; // 1 hour default
    let stopAfter = false;

    // Default messages
    const messages = {
        1: "Oi [Name], ainda está por aí? Ficamos no aguardo da sua resposta para continuarmos seu atendimento.",
        2: "Olá [Name], como você não conseguiu nos responder agora, vou mover seu atendimento para uma próxima etapa e entramos em contato amanhã novamente, tudo bem?",
        3: "Bom dia [Name]! Retomando nosso contato de ontem. Como podemos te ajudar hoje?",
        4: "Olá [Name], ainda não conseguimos falar com você. Vou encaminhar seu contato para nossa equipe de acompanhamento. Se precisar de algo, basta nos chamar aqui!"
    };

    let content = messages[step] || "Olá, ainda aguardamos sua resposta.";
    content = content.replace("[Name]", lead.name || "Cliente");

    try {
        // 1. Send Message
        const whatsappId = await sendMessage(lead.phone, content);
        
        // 2. Save Message to DB
        await this.prisma.message.create({
            data: {
                content,
                isFromMe: true,
                leadId: lead.id,
                whatsappId,
                status: "SENT"
            }
        });

        // 3. Logic based on Step
        if (step === 2) {
            // End of Day 1. Move to "2º Tentativa de Contato" and schedule for tomorrow
            const stageId = this.stages["2º Tentativa de Contato"];
            if (stageId) {
                await this.prisma.lead.update({
                    where: { id: lead.id },
                    data: { stageId }
                });
                if (this.io) this.io.emit("lead:updated", { id: lead.id, stageId });
            }
            // Schedule for tomorrow (24 hours from now)
            nextDelay = 24 * 60 * 60 * 1000; 
        } else if (step === 4) {
            // End of Day 2. Move to "3º Tentativa de Contato" and STOP
            const stageId = this.stages["3º Tentativa de Contato"];
            if (stageId) {
                await this.prisma.lead.update({
                    where: { id: lead.id },
                    data: { stageId }
                });
                if (this.io) this.io.emit("lead:updated", { id: lead.id, stageId });
            }
            stopAfter = true;
        }

        // 4. Update FollowUp record
        if (stopAfter) {
            await this.prisma.followUp.update({
                where: { id: fu.id },
                data: { isActive: false }
            });
        } else {
            await this.prisma.followUp.update({
                where: { id: fu.id },
                data: { 
                    step: nextStep,
                    nextActionAt: new Date(Date.now() + nextDelay)
                }
            });
        }

        // Notify UI about message
        if (this.io) this.io.emit("message:sent", { leadId: lead.id, content, isFromMe: true });

    } catch (err) {
        console.error(`[FollowUpService] Failed to execute step for ${lead.phone}:`, err.message);
    }
  }

  /**
   * Start a new follow-up sequence or reset an existing one
   */
  async initiate(leadId) {
    try {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        
        await this.prisma.followUp.upsert({
            where: { leadId },
            update: {
                step: 1,
                nextActionAt: oneHourFromNow,
                isActive: true
            },
            create: {
                leadId,
                step: 1,
                nextActionAt: oneHourFromNow,
                isActive: true
            }
        });
        console.log(`[FollowUpService] Sequence initiated for lead ${leadId}`);
    } catch (err) {
        console.error(`[FollowUpService] Failed to initiate for ${leadId}:`, err.message);
    }
  }

  /**
   * Called when a lead responds.
   * Cancels follow-up and moves to "EM ATENDIMENTO".
   */
  async handleLeadResponse(leadId) {
    try {
        await this.cancel(leadId);
        
        // Ensure stages are loaded
        if (Object.keys(this.stages).length === 0) {
            const allStages = await this.prisma.stage.findMany();
            allStages.forEach(s => { this.stages[s.name] = s.id; });
        }

        const stageId = this.stages["EM ATENDIMENTO"];
        if (stageId) {
            await this.prisma.lead.update({
                where: { id: leadId },
                data: { stageId }
            });
            if (this.io) this.io.emit("lead:updated", { id: leadId, stageId });
            console.log(`[FollowUpService] Lead ${leadId} moved to EM ATENDIMENTO`);
        }
    } catch (err) {
        console.error(`[FollowUpService] Failed to handle response for ${leadId}:`, err.message);
    }
  }

  /**
   * Stop any active follow-up for a lead (e.g. when lead responds)
   */
  async cancel(leadId) {
    try {
        await this.prisma.followUp.update({
            where: { leadId },
            data: { isActive: false }
        });
        console.log(`[FollowUpService] Sequence cancelled for lead ${leadId}`);
    } catch (err) {
        // Might not exist, ignore
    }
  }
}

module.exports = new FollowUpService();
