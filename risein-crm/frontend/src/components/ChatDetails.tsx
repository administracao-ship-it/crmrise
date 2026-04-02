"use client";

import { useState, useEffect } from "react";
import { 
  User, Phone, DollarSign, Calendar, MapPin, 
  ExternalLink, ShieldCheck, Home, Target, ArrowRight, Bot
} from "lucide-react";
import { type Lead, type Stage, updateLead } from "@/lib/api";

interface ChatDetailsProps {
  lead: Lead | null;
  stages: Stage[];
}

export default function ChatDetails({ lead, stages }: ChatDetailsProps) {
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setEditedLead(lead);
    }
  }, [lead]);

  if (!lead) return (
    <div className="chat-details-empty">
      <User size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
      <p>Selecione um contato para ver detalhes</p>
    </div>
  );

  const currentStage = stages.find(s => s.id === lead.stageId);
  const nextStage = currentStage ? stages.find(s => s.order === currentStage.order + 1) : null;

  const handleChange = (field: keyof Lead, value: any) => {
    setEditedLead(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = async (field: keyof Lead) => {
    if (!lead || editedLead[field] === lead[field]) return;

    setSaving(true);
    try {
      await updateLead(lead.id, { [field]: editedLead[field] });
      // Note: Ideally we would update the global state here via a callback, 
      // but for now the server update is the priority.
    } catch (err) {
      console.error("Failed to update lead:", err);
      setEditedLead(lead); // Rollback
    } finally {
      setSaving(false);
    }
  };

  const handleOpenProfile = () => {
    // Open a search on Google with the phone or name as a proxy for "profile"
    // In a real app, this would be a link to a detailed lead page
    window.open(`https://www.google.com/search?q=${encodeURIComponent(lead.name)}`, '_blank');
  };

  const handleMoveStage = async () => {
    if (!nextStage) return;
    setSaving(true);
    try {
      await updateLead(lead.id, { stageId: nextStage.id });
      // Force reload or update context would be needed here
      window.location.reload(); 
    } catch (err) {
       console.error("Failed to move stage:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="chat-details-container">
      <div className="chat-details-header">
        <div className="chat-details-avatar-editable">
          {lead.name.charAt(0).toUpperCase()}
        </div>
        
        <input 
          className="chat-details-name-input"
          value={editedLead.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
        />
        <p style={{ opacity: 0.5, fontSize: "12px", marginBottom: "16px" }}>{lead.id}</p>
        
        <div className="chat-details-actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-social-outline" onClick={handleOpenProfile}>
            <ExternalLink size={14} /> Perfil
          </button>
          <button 
            className={`btn-social-outline ${editedLead.isAgentActive ? 'ai-active' : ''}`} 
            onClick={() => {
              const newValue = !editedLead.isAgentActive;
              handleChange("isAgentActive", newValue);
              setSaving(true);
              updateLead(lead.id, { isAgentActive: newValue }).finally(() => setSaving(false));
            }}
            style={{ 
              borderColor: editedLead.isAgentActive ? 'var(--accent-blue)' : 'var(--border-color)',
              color: editedLead.isAgentActive ? '#fff' : 'inherit',
              backgroundColor: editedLead.isAgentActive ? 'var(--accent-blue)' : 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Bot size={14} /> IA: {editedLead.isAgentActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="chat-details-section">
        <h4>Informações do Lead</h4>
        <div className="chat-details-grid">
          <div className="detail-item">
            <Phone size={14} />
            <input 
              className="detail-input"
              value={editedLead.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              placeholder="Telefone"
            />
          </div>
          <div className="detail-item">
            <DollarSign size={14} />
            <input 
              className="detail-input"
              type="number"
              value={editedLead.value || 0}
              onChange={(e) => handleChange("value", e.target.value ? parseFloat(e.target.value) : 0)}
              onBlur={() => handleBlur("value")}
              placeholder="Valor"
            />
          </div>
          <div className="detail-item">
            <MapPin size={14} />
            <input 
              className="detail-input"
              value={editedLead.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              onBlur={() => handleBlur("city")}
              placeholder="Cidade"
            />
          </div>
          <div className="detail-item">
            <Home size={14} />
            <input 
              className="detail-input"
              value={editedLead.title || ""}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
              placeholder="Ambiente"
            />
          </div>
          <div className="detail-item">
            <Calendar size={14} />
            <span style={{ color: "white" }}>Criado em {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      <div className="chat-details-section">
        <h4>Qualificação</h4>
        <div className="detail-item">
          <Target size={14} />
          <input 
            className="detail-input"
            value={editedLead.phase || ""}
            onChange={(e) => handleChange("phase", e.target.value)}
            onBlur={() => handleBlur("phase")}
            placeholder="Nível de Qualificação"
          />
        </div>
      </div>

      {nextStage && (
        <div className="chat-details-section">
          <h4>Próxima Etapa</h4>
          <div className="detail-item" style={{ background: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.3)" }}>
            <ArrowRight size={14} color="#3b82f6" />
            <span style={{ color: "#3b82f6", fontWeight: "600" }}>{nextStage.name}</span>
          </div>
        </div>
      )}

      <div className="chat-details-footer" style={{ marginTop: "auto", paddingTop: "24px" }}>
        <button 
          className="btn-primary" 
          style={{ width: '100%', opacity: nextStage ? 1 : 0.5 }} 
          disabled={saving || !nextStage}
          onClick={handleMoveStage}
        >
          {saving ? "PROCESSANDO..." : "MOVER PARA PRÓXIMA ETAPA"}
        </button>
      </div>
    </div>
  );
}
