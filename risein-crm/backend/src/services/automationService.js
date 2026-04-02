const { sendMessage } = require("./whatsapp");

/**
 * Service for CRM Automations.
 * Handles triggering and executing visual flow rules.
 * In a production environment, 'Delay' nodes should use a persistent worker (like BullMQ).
 * Here we use setTimeout for immediate local development.
 */
class AutomationService {
  constructor() {
    this.prisma = null;
    this.io = null;
  }

  init(prisma, io) {
    this.prisma = prisma;
    this.io = io;
    console.log("[AutomationService] Initialized");
  }

  /**
   * Main entry point to trigger automations based on events.
   */
  async trigger(type, leadId, context = {}) {
    if (!this.prisma) {
        console.warn("[AutomationService] Trigger called before initialization");
        return;
    }

    try {
      // Find rules matching the trigger type
      const rules = await this.prisma.automationRule.findMany({
        where: {
          triggerType: type,
          isActive: true,
        }
      });

      // Filter by triggerId if provided (e.g. stageId filtering)
      const matchingRules = rules.filter(rule => {
          if (!rule.triggerId) return true; // generic trigger
          return rule.triggerId === context.triggerId;
      });

      console.log(`[Automation] Triggering ${type} for lead ${leadId}. Found ${matchingRules.length} matching rules.`);

      for (const rule of matchingRules) {
        this.executeRule(rule, leadId);
      }
    } catch (err) {
      console.error(`[Automation] Error triggering ${type}:`, err);
    }
  }

  async executeRule(rule, leadId) {
    try {
        const nodes = JSON.parse(rule.nodes || "[]");
        const edges = JSON.parse(rule.edges || "[]");

        // Find the trigger node
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) {
            console.warn(`[Automation] Rule ${rule.name} (ID: ${rule.id}) has no trigger node`);
            return;
        }

        // Start traversal from the trigger node
        await this.processNext(triggerNode.id, nodes, edges, leadId);
    } catch (err) {
        console.error(`[Automation] Error executing rule ${rule.id}:`, err);
    }
  }

  async processNext(currentNodeId, nodes, edges, leadId, specificHandle = null) {
    // Find all outgoing edges from the current node
    const outgoingEdges = edges.filter(e => {
        let match = e.source === currentNodeId;
        if (specificHandle) {
            match = match && e.sourceHandle === specificHandle;
        }
        return match;
    });
    
    for (const edge of outgoingEdges) {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode) {
        await this.executeNode(targetNode, nodes, edges, leadId);
      }
    }
  }

  async executeNode(node, nodes, edges, leadId) {
    // Re-fetch lead to get latest state (important for conditions and actions)
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { 
          tags: true,
          stage: true
      }
    });
    if (!lead) return;

    console.log(`[Automation] Executing node: ${node.type} (${node.id}) for lead ${lead.phone}`);

    switch (node.type) {
      case 'message':
        await this.handleMessageNode(node, lead);
        await this.processNext(node.id, nodes, edges, leadId);
        break;

      case 'delay':
        await this.handleDelayNode(node, leadId, nodes, edges);
        break;

      case 'action':
        await this.handleActionNode(node, leadId);
        await this.processNext(node.id, nodes, edges, leadId);
        break;

      case 'condition':
        const branchId = await this.handleConditionNode(node, lead);
        // In visual flow, branching uses handles like 'true' / 'false'
        await this.processNext(node.id, nodes, edges, leadId, branchId);
        break;

      default:
        // For other node types, just continue
        await this.processNext(node.id, nodes, edges, leadId);
        break;
    }
  }

  async handleMessageNode(node, lead) {
    let content = node.data?.content || "";
    if (!content) return;

    // Replace variables like [Contact: Full name] -> lead.name
    content = content.replace(/\[Contact: Full name\]/g, lead.name || "Cliente");
    content = content.replace(/\[Contact: Phone\]/g, lead.phone || "");
    
    try {
      await sendMessage(lead.phone, content);
      
      // Save message in history if needed
      await this.prisma.message.create({
        data: {
          content,
          isFromMe: true,
          leadId: lead.id,
          status: "SENT",
          type: "text"
        }
      });

      // Broadcast to UI
      if (this.io) {
          this.io.emit("message:received", { leadId: lead.id, content, isFromMe: true });
      }
    } catch (err) {
      console.error(`[Automation] Failed to send message to ${lead.phone}:`, err);
    }
  }

  async handleDelayNode(node, leadId, nodes, edges) {
    const duration = parseInt(node.data?.delay || "0");
    const unit = node.data?.unit || 'minutes';
    
    let ms = duration * 1000;
    if (unit === 'minutes') ms *= 60;
    if (unit === 'hours') ms *= 3600;
    if (unit === 'days') ms *= 86400;

    console.log(`[Automation] Waiting ${duration} ${unit} before next node`);

    // Simple implementation for demo/local use
    setTimeout(async () => {
      await this.processNext(node.id, nodes, edges, leadId);
    }, ms);
  }

  async handleActionNode(node, leadId) {
    const action = node.data?.action; // 'ADD_TAG', 'UPDATE_STAGE', 'UPDATE_FIELD'
    
    try {
        if (action === 'ADD_TAG') {
          const tagId = node.data.tagId;
          await this.prisma.lead.update({
            where: { id: leadId },
            data: { tags: { connect: { id: tagId } } }
          });
        } else if (action === 'UPDATE_FIELD') {
            const field = node.data.field;
            const value = node.data.value;
            await this.prisma.lead.update({
                where: { id: leadId },
                data: { [field]: value }
            });
        }
    } catch (err) {
        console.error(`[Automation] Action failed:`, err);
    }
  }

  async handleConditionNode(node, lead) {
    const field = node.data?.field;
    const operator = node.data?.operator;
    const value = node.data?.value;

    let result = false;
    const leadValue = lead[field];

    if (operator === 'equals') result = String(leadValue) === String(value);
    if (operator === 'contains') result = String(leadValue).includes(String(value));
    if (operator === 'greater') result = Number(leadValue) > Number(value);

    return result ? 'true' : 'false';
  }
}

module.exports = new AutomationService();
