const isServer = typeof window === 'undefined';
export const API_URL = isServer 
  ? (process.env.INTERNAL_BACKEND_URL || "http://backend:3001") 
  : ""; // Use relative paths in the browser

export interface Stage {
    id: string;
    name: string;
    order: number;
    leads: Lead[];
}

export interface Lead {
    id: string;
    name: string;
    phone: string;
    value: number;
    title?: string;
    phase?: string;
    city?: string;
    closedAt?: string;
    avatarUrl?: string;
    isAgentActive?: boolean;
    stageId: string;
    order?: number;
    userId?: string;
    createdAt: string;
    updatedAt: string;
    tags?: Tag[];
    stage?: Stage;
    messages?: Message[];
}

export interface Message {
    id: string;
    content?: string;
    type: string;
    mediaUrl?: string;
    mimeType?: string;
    status: string;
    whatsappId?: string;
    isFromMe: boolean;
    timestamp: string;
    leadId: string;
}

export async function fetchStages(): Promise<Stage[]> {
    const res = await fetch(`${API_URL}/api/stages`);
    if (!res.ok) throw new Error("Failed to fetch stages");
    return res.json();
}

export async function createLead(data: {
    name: string;
    phone: string;
    value?: number;
    stageId: string;
    title?: string;
    phase?: string;
    city?: string;
}): Promise<Lead> {
    const res = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create lead");
    return res.json();
}

export async function updateLead(
    id: string,
    data: Partial<Lead>
): Promise<Lead> {
    const res = await fetch(`${API_URL}/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update lead");
    return res.json();
}

export async function deleteLead(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/leads/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete lead");
}

export async function refreshLeadAvatar(id: string): Promise<Lead> {
    const res = await fetch(`${API_URL}/api/leads/${id}/avatar`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to refresh lead avatar");
    return res.json();
}

export async function syncAllAvatars(): Promise<{ message: string, count: number }> {
    const res = await fetch(`${API_URL}/api/leads/sync-avatars`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to start bulk avatar sync");
    return res.json();
}

export async function fetchMessages(leadId: string): Promise<Message[]> {
    const res = await fetch(`${API_URL}/api/messages/${leadId}`);
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
}

export async function sendMessage(
    leadId: string,
    content: string | FormData
): Promise<Message> {
    const isFormData = content instanceof FormData;
    const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
    const body = isFormData ? content : JSON.stringify({ content });

    const res = await fetch(`${API_URL}/api/messages/${leadId}`, {
        method: "POST",
        headers: headers,
        body: body,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to send message");
    }
    return res.json();
}

export async function syncMessageMedia(messageId: string): Promise<Message> {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/sync-media`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to sync message media");
    return res.json();
}

export async function getWhatsAppStatus(): Promise<{
    status: string;
    qr: string | null;
}> {
    const res = await fetch(`${API_URL}/api/messages/whatsapp/status`);
    if (!res.ok) throw new Error("Failed to get WhatsApp status");
    return res.json();
}
export async function connectWhatsApp(): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/messages/whatsapp/connect`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to connect WhatsApp");
    return res.json();
}

export async function disconnectWhatsApp(): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/messages/whatsapp/disconnect`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to disconnect WhatsApp");
    return res.json();
}

export async function resetWhatsApp(): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/messages/whatsapp/reset`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to reset WhatsApp session");
    return res.json();
}

export async function updateStage(
    id: string,
    data: { name?: string; order?: number }
): Promise<Stage> {
    const res = await fetch(`${API_URL}/api/stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update stage");
    return res.json();
}

export async function createStage(data: { name: string; order: number }): Promise<Stage> {
    const res = await fetch(`${API_URL}/api/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create stage");
    return res.json();
}

export async function fetchConfig(): Promise<{ 
    funnelName: string; 
    openAiApiKey?: string; 
    systemPrompt?: string;
    humanTakeoverMessage?: string;
    aiTriggerMessages?: string;
    isAiActive?: boolean;
}> {
    const res = await fetch(`${API_URL}/api/config`);
    if (!res.ok) throw new Error("Failed to fetch config");
    return res.json();
}

export async function updateConfig(data: { 
    funnelName?: string; 
    openAiApiKey?: string; 
    systemPrompt?: string;
    humanTakeoverMessage?: string;
    aiTriggerMessages?: string;
    isAiActive?: boolean;
}): Promise<{ 
    funnelName?: string; 
    openAiApiKey?: string; 
    systemPrompt?: string;
    humanTakeoverMessage?: string;
    aiTriggerMessages?: string;
    isAiActive?: boolean;
}> {
    const res = await fetch(`${API_URL}/api/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update config");
    return res.json();
}

// --- Tags ---
export interface Tag {
    id: string;
    name: string;
    color?: string;
}

export async function fetchTags(): Promise<Tag[]> {
    const res = await fetch(`${API_URL}/api/tags`);
    if (!res.ok) throw new Error("Failed to fetch tags");
    return res.json();
}

export async function createTag(data: { name: string; color?: string }): Promise<Tag> {
    const res = await fetch(`${API_URL}/api/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create tag");
    return res.json();
}

export async function deleteTag(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/tags/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete tag");
}

export async function addTagToLead(leadId: string, tagId: string): Promise<Lead> {
    const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tags: { connect: [{ id: tagId }] }
        }),
    });
    if (!res.ok) throw new Error("Failed to add tag to lead");
    return res.json();
}

export async function removeTagFromLead(leadId: string, tagId: string): Promise<Lead> {
    const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tags: { disconnect: [{ id: tagId }] }
        }),
    });
    if (!res.ok) throw new Error("Failed to remove tag from lead");
    return res.json();
}

// --- Improvement Points ---
export interface ImprovementPoint {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    status: "Pendente" | "Ajustando" | "Finalizado";
    createdAt: string;
    updatedAt: string;
}

export async function fetchImprovements(): Promise<ImprovementPoint[]> {
    const res = await fetch(`${API_URL}/api/improvements`);
    if (!res.ok) throw new Error("Failed to fetch improvements");
    return res.json();
}

export async function createImprovement(formData: FormData): Promise<ImprovementPoint> {
    const res = await fetch(`${API_URL}/api/improvements`, {
        method: "POST",
        body: formData, // multipart for image upload
    });
    if (!res.ok) throw new Error("Failed to create improvement");
    return res.json();
}

export async function updateImprovementStatus(
    id: string,
    status: string
): Promise<ImprovementPoint> {
    const res = await fetch(`${API_URL}/api/improvements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update improvement status");
    return res.json();
}

export async function deleteImprovement(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/improvements/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete improvement");
}

export interface BulkContact {
    name: string;
    phone: string;
}

export interface BulkJob {
    id: string;
    message: string;
    mediaUrl?: string;
    totalContacts: number;
    processedCount: number;
    successCount: number;
    errorCount: number;
    status: string;
    createdAt: string;
}

export async function sendBulkMessages(data: {
    contacts: BulkContact[];
    message: string;
    mediaUrl?: string;
    delayMin?: number;
    delayMax?: number;
}): Promise<{ success: boolean; jobId: string }> {
    const res = await fetch(`${API_URL}/api/messages/whatsapp/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to start bulk messaging");
    }
    return res.json();
}

export async function fetchBulkHistory(): Promise<BulkJob[]> {
    const res = await fetch(`${API_URL}/api/messages/whatsapp/bulk/history`);
    if (!res.ok) throw new Error("Failed to fetch bulk history");
    return res.json();
}

export async function uploadCampaignMedia(file: File): Promise<{ mediaUrl: string; mimeType: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/api/messages/whatsapp/media-upload`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload media");
    return res.json();
}

export interface AiMetrics {
    summary: {
        totalAiMessages: number;
        leadsServed: number;
        humanMessages: number;
        convertedLeads: number;
        efficiency: number;
    };
    chartData: { date: string; count: number }[];
}

export async function fetchAiMetrics(startDate?: string, endDate?: string): Promise<AiMetrics> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    
    const res = await fetch(`${API_URL}/api/metrics/ai?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch AI metrics");
    return res.json();
}
