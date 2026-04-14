"use client";

import { useState, useEffect } from "react";
import { 
  User, Phone, DollarSign, Calendar, MapPin, 
  ExternalLink, ShieldCheck, Home, Target, ArrowRight, Bot
} from "lucide-react";
import { type Lead, type Stage, updateLead } from "@/lib/api";
import toast from "react-hot-toast";

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
    <div className="chat-details-container glass-panel">
      <div className="chat-details-header">
        <div className="chat-details-avatar-editable shadow-glow">
          {lead.name.charAt(0).toUpperCase()}
        </div>
        
        <input 
          className="chat-details-name-input"
          value={editedLead.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}
        />
        
        <div className="lead-status-badges" style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
            <span className="badge-glass">ID: {lead.id.slice(-6)}</span>
            <span className="badge-glass" style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}>{currentStage?.name}</span>
        </div>
        
        <div className="chat-details-actions-grid">
          <button className="chat-action-card" onClick={handleOpenProfile}>
            <ExternalLink size={18} />
            <span>Ver Perfil</span>
          </button>
          <button 
            className={`chat-action-card ${editedLead.isAgentActive ? 'active' : ''}`} 
            onClick={() => {
              const newValue = !editedLead.isAgentActive;
              handleChange("isAgentActive", newValue);
              setSaving(true);
              updateLead(lead.id, { isAgentActive: newValue })
                .then(() => toast.success(`IA ${newValue ? 'ativada' : 'desativada'}`))
                .finally(() => setSaving(false));
            }}
          >
            <Bot size={18} />
            <span>IA: {editedLead.isAgentActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="chat-details-content-scroll">
          <div className="chat-details-section">
            <h4 className="section-title">Dados Comerciais</h4>
            <div className="compact-grid">
              <div className="detail-item-v2">
                <label><Phone size={12} /> Telefone</label>
                <input 
                  value={editedLead.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                />
              </div>
              <div className="detail-item-v2">
                <label><DollarSign size={12} /> Valor Estimado</label>
                <input 
                  type="number"
                  value={editedLead.value || 0}
                  onChange={(e) => handleChange("value", e.target.value ? parseFloat(e.target.value) : 0)}
                  onBlur={() => handleBlur("value")}
                />
              </div>
              <div className="detail-item-v2">
                <label><MapPin size={12} /> Localização</label>
                <input 
                  value={editedLead.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                />
              </div>
              <div className="detail-item-v2">
                <label><Home size={12} /> Ambiente</label>
                <input 
                  value={editedLead.title || ""}
                  onChange={(e) => handleChange("title", e.target.value)}
                  onBlur={() => handleBlur("title")}
                />
              </div>
            </div>
          </div>

          <div className="chat-details-section">
            <h4 className="section-title">Qualificação</h4>
            <div className="detail-item-v2 full-width">
              <label><Target size={12} /> Nível de Qualificação</label>
              <input 
                value={editedLead.phase || ""}
                onChange={(e) => handleChange("phase", e.target.value)}
                onBlur={() => handleBlur("phase")}
                placeholder="Ex: Lead Quente, Frio..."
              />
            </div>
          </div>

          <div className="chat-details-section">
            <h4 className="section-title">Histórico</h4>
            <div className="history-pill">
              <Calendar size={12} />
              <span>Entrou no funil em {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
      </div>

      <div className="chat-details-footer-fixed">
        {nextStage ? (
            <button 
              className="btn-primary-glow"
              disabled={saving}
              onClick={handleMoveStage}
            >
              {saving ? "AVANÇANDO..." : `AVANÇAR PARA: ${nextStage.name.toUpperCase()}`}
              {!saving && <ArrowRight size={16} />}
            </button>
        ) : (
            <div className="max-stage-reached">🚀 Lead no estágio final</div>
        )}
      </div>
    </div>
  );
}
