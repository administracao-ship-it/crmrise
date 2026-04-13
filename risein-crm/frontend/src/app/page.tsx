"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  pointerWithin,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { Bot } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KanbanColumn from "@/components/KanbanColumn";
import ChatPanel from "@/components/ChatPanel";
import ChatModule from "@/components/ChatModule";
import NewLeadModal from "@/components/NewLeadModal";
import WhatsAppModal from "@/components/WhatsAppModal";
import LeadTable from "@/components/LeadTable";
import SettingsPage from "@/components/SettingsPage";
import DisparosPage from "@/components/DisparosPage";
import { 
  fetchStages, 
  updateLead, 
  deleteLead,
  updateStage,
  getWhatsAppStatus, 
  connectWhatsApp,
  disconnectWhatsApp as apiDisconnectWhatsApp,
  resetWhatsApp as apiResetWhatsApp,
  fetchConfig,
  updateConfig 
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Stage, Lead, Message } from "@/lib/api";
import toast from 'react-hot-toast';

export default function HomePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [activeTab, setActiveTab] = useState("Leads");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [funnelName, setFunnelName] = useState("CRM RISE");
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<{ id: string, name: string } | null>(null);
  const [editLeadValue, setEditLeadValue] = useState("");
  const [editStageValue, setEditStageValue] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadData = useCallback(async () => {
    try {
      const [stagesData, configData] = await Promise.all([
        fetchStages(),
        fetchConfig()
      ]);
      setStages(stagesData);
      if (configData.funnelName) setFunnelName(configData.funnelName);
      if (configData.openAiApiKey) setOpenAiApiKey(configData.openAiApiKey);
      if (configData.systemPrompt) setSystemPrompt(configData.systemPrompt);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch initial WhatsApp status
    const syncWhatsAppStatus = async () => {
      try {
        const { status, qr } = await getWhatsAppStatus();
        setWhatsappStatus(status);
        if (qr) setQrCode(qr);
        if (status === "waiting_qr") setShowWhatsAppModal(true);
      } catch (err) {
        console.error("Failed to sync WhatsApp status:", err);
      }
    };

    loadData();

    const socket = getSocket();

    socket.on("whatsapp:status", (data: { status: string, qr?: string }) => {
      setWhatsappStatus(data.status);
      if (data.qr) setQrCode(data.qr);
    });
    socket.on("whatsapp:qr", (qr: string) => {
      setWhatsappStatus("waiting_qr");
      setQrCode(qr);
      setShowWhatsAppModal(true);
    });
    socket.on("whatsapp:disconnected", () => {
      setWhatsappStatus("disconnected");
      setQrCode(null);
    });
    socket.on("whatsapp:authenticated", () => {
      setWhatsappStatus("authenticated");
      setQrCode(null);
    });
    socket.on("whatsapp:ready", () => {
      setWhatsappStatus("connected");
      setQrCode(null);
      setShowWhatsAppModal(false);
    });

    socket.on("lead:created", (lead: Lead) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id === lead.stageId ? { ...s, leads: [lead, ...s.leads] } : s
        )
      );
    });

    socket.on("lead:updated", (lead: Lead) => {
      setStages((prev) =>
        prev.map((s) => ({
          ...s,
          leads: s.leads.map((l) => (l.id === lead.id ? { ...lead, messages: l.messages } : l)),
        }))
      );
      if (editingLead?.id === lead.id) setEditingLead(null);
    });

    socket.on("lead:deleted", (leadId: string) => {
      setStages((prev) =>
        prev.map((s) => ({
          ...s,
          leads: s.leads.filter((l) => l.id !== leadId),
        }))
      );
    });

    socket.on("message:received", (data: { lead: Lead } & Message) => {
      setStages((prev) =>
        prev.map((s) => ({
          ...s,
          leads: s.leads.map((l) =>
            l.id === data.lead.id
              ? { 
                  ...l, 
                  messages: l.messages?.find(m => m.id === data.id) 
                    ? l.messages 
                    : [data as never, ...(l.messages || [])] 
                }
              : l
          ),
        }))
      );
    });

    syncWhatsAppStatus();

    return () => {
      socket.off("whatsapp:ready");
      socket.off("whatsapp:qr");
      socket.off("whatsapp:disconnected");
      socket.off("whatsapp:authenticated");
      socket.off("lead:created");
      socket.off("lead:updated");
      socket.off("lead:deleted");
      socket.off("message:received");
    };
  }, [loadData, editingLead]);

  const totalLeads = useMemo(() => stages.reduce((acc, s) => acc + s.leads.length, 0), [stages]);
  const totalValue = useMemo(() => stages.reduce(
    (acc, s) => acc + s.leads.reduce((sum, l) => sum + (l.value || 0), 0),
    0
  ), [stages]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    const activeLeadId = active.id as string;
    const destStageId = overData.stageId || overData.lead?.stageId;

    if (!destStageId) return;

    setStages((prev) => {
      let lead: Lead | undefined;
      let actualSourceStageId: string | undefined;
      
      for (const s of prev) {
        const found = s.leads.find(l => l.id === activeLeadId);
        if (found) {
          lead = found;
          actualSourceStageId = s.id;
          break;
        }
      }

      if (!lead || !actualSourceStageId || actualSourceStageId === destStageId) return prev;

      return prev.map((s) => {
        if (s.id === actualSourceStageId) {
          return { ...s, leads: s.leads.filter((l) => l.id !== activeLeadId) };
        }
        if (s.id === destStageId) {
          if (s.leads.find(l => l.id === activeLeadId)) return s;
          return { ...s, leads: [...s.leads, { ...lead!, stageId: destStageId }] };
        }
        return s;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overData = over.data.current;
    
    const newStageId = overData?.stageId || overData?.lead?.stageId;

    if (newStageId) {
      try {
        await updateLead(leadId, { stageId: newStageId });
        console.log(`Moved lead ${leadId} to stage ${newStageId}`);
      } catch (err) {
        console.error("Failed to move lead:", err);
        loadData();
      }
    }
  };

  const handleLeadCreated = (lead: Lead) => {
    // Lead created via Socket.io will handle UI update
  };

  const handleAddLeadClick = (stageId: string) => {
    setDefaultStageId(stageId);
    setShowNewLead(true);
  };

  const handleDeleteLead = async (lead: Lead) => {
    setConfirmDialog({
      message: `Deseja remover permanentemente o lead "${lead.name}"?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteLead(lead.id);
          toast.success(`Lead "${lead.name}" removido`);
        } catch (err) {
          console.error("Failed to delete lead:", err);
          toast.error("Erro ao remover lead");
        }
      },
    });
  };

  const handleUpdateLeadName = async (newName: string) => {
    if (!editingLead || !newName.trim()) return;
    try {
      await updateLead(editingLead.id, { name: newName.trim() });
      setEditingLead(null);
      toast.success("Lead atualizado com sucesso");
    } catch (err) {
      console.error("Failed to update lead name:", err);
      toast.error("Erro ao atualizar lead");
    }
  };

  const handleUpdateStageName = async (newName: string) => {
    if (!editingStage || !newName.trim()) return;
    try {
      await updateStage(editingStage.id, { name: newName.trim() });
      setEditingStage(null);
      loadData();
      toast.success("Etapa atualizada com sucesso");
    } catch (err) {
      console.error("Failed to update stage name:", err);
      toast.error("Erro ao atualizar etapa");
    }
  };

  const handleUpdateFunnelName = async (newName: string) => {
    if (!newName.trim()) return;
    try {
      setFunnelName(newName.trim()); // Optimistic update
      await updateConfig({ funnelName: newName.trim() });
    } catch (err) {
      console.error("Failed to update funnel name:", err);
    }
  };

  const handleUpdateConfig = async (newKey: string, newPrompt: string) => {
    try {
      setOpenAiApiKey(newKey.trim());
      setSystemPrompt(newPrompt.trim());
      await updateConfig({ openAiApiKey: newKey.trim(), systemPrompt: newPrompt.trim() });
    } catch (err) {
      console.error("Failed to update OpenAI config:", err);
    }
  };

  const wrapConnectWhatsApp = async () => {
    try {
      await connectWhatsApp();
    } catch (err) {
      console.error("Failed to connect WhatsApp:", err);
    }
  };

  const wrapDisconnectWhatsApp = async () => {
    try {
      await apiDisconnectWhatsApp();
      setWhatsappStatus("disconnected");
      setQrCode(null);
    } catch (err) {
      console.error("Failed to disconnect WhatsApp:", err);
    }
  };

  const wrapResetWhatsApp = async () => {
    try {
      await apiResetWhatsApp();
      setWhatsappStatus("disconnected");
      setQrCode(null);
    } catch (err) {
      console.error("Failed to reset WhatsApp:", err);
    }
  };

  const handleLogout = () => {
    document.cookie = "auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const filteredStages = useMemo(() => stages.map((stage) => ({
    ...stage,
    leads: stage.leads.filter(
      (lead) =>
        !searchQuery ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery)
    ),
  })), [stages, searchQuery]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-secondary)",
          fontSize: 14,
        }}
      >
        <div className="loading">Carregando Rise In...</div>
      </div>
    );
  }

  return (
    <>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <Header
        totalLeads={totalLeads}
        totalValue={totalValue}
        onNewLead={() => setShowNewLead(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewChange={setViewMode}
        funnelName={funnelName}
        onUpdateFunnelName={handleUpdateFunnelName}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === "Leads" ? (
          viewMode === "kanban" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.Always,
                },
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="kanban-board">
                {filteredStages.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    id={stage.id}
                    title={stage.name}
                    leads={stage.leads}
                    onLeadClick={setSelectedLead}
                    onEditStage={(s) => { setEditingStage(s); setEditStageValue(s.name); }}
                    onEditLead={(l) => { setEditingLead(l); setEditLeadValue(l.name); }}
                    onDeleteLead={handleDeleteLead}
                    onAddLead={handleAddLeadClick}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeDragId ? (
                  <div className="lead-card" style={{ opacity: 0.9, transform: "rotate(3deg)", pointerEvents: 'none' }}>
                    <div className="lead-name">
                      {stages
                        .flatMap((s) => s.leads)
                        .find((l) => l.id === activeDragId)?.name || ""}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <LeadTable 
              leads={filteredStages.flatMap(s => s.leads)} 
              onLeadClick={setSelectedLead} 
            />
          )
        ) : activeTab === "Chats" ? (
          <ChatModule stages={stages} />
        ) : activeTab === "Disparos" ? (
          <DisparosPage />
        ) : activeTab === "Settings" ? (
          <SettingsPage 
            funnelName={funnelName}
            onUpdateFunnelName={handleUpdateFunnelName}
            openAiApiKey={openAiApiKey}
            systemPrompt={systemPrompt}
            onUpdateOpenAi={handleUpdateConfig}
            whatsappStatus={whatsappStatus}
            onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
            stages={stages}
          />
        ) : null}
      </main>

      <ChatPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />

      {showNewLead && (
        <NewLeadModal
          stages={stages}
          initialStageId={defaultStageId || undefined}
          onClose={() => { setShowNewLead(false); setDefaultStageId(null); }}
          onCreated={handleLeadCreated}
        />
      )}

      {editingLead && (
        <div className="modal-overlay" onClick={() => setEditingLead(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Lead</h2>
            <div className="form-group">
              <label>Nome do Lead</label>
              <input
                type="text"
                value={editLeadValue}
                onChange={(e) => setEditLeadValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateLeadName(editLeadValue);
                  if (e.key === 'Escape') setEditingLead(null);
                }}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingLead(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => handleUpdateLeadName(editLeadValue)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editingStage && (
        <div className="modal-overlay" onClick={() => setEditingStage(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Nome da Etapa</h2>
            <div className="form-group">
              <label>Novo Nome</label>
              <input
                type="text"
                value={editStageValue}
                onChange={(e) => setEditStageValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateStageName(editStageValue);
                  if (e.key === 'Escape') setEditingStage(null);
                }}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingStage(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => handleUpdateStageName(editStageValue)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && (
        <WhatsAppModal
          status={whatsappStatus}
          qrCode={qrCode}
          onClose={() => setShowWhatsAppModal(false)}
          onConnect={wrapConnectWhatsApp}
          onDisconnect={wrapDisconnectWhatsApp}
          onReset={wrapResetWhatsApp}
        />
      )}

      {confirmDialog && (
        <div className="modal-overlay" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <p className="confirm-message">{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setConfirmDialog(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDialog.onConfirm}>Remover</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
