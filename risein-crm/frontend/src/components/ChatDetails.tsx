"use client";

import { useState, useEffect } from "react";
import { 
  User, Phone, DollarSign, Calendar, MapPin, 
  ExternalLink, ShieldCheck, Home, Target, ArrowRight, Bot, RefreshCw,
  Tags, X, Plus
} from "lucide-react";
import { 
  type Lead, type Stage, type Tag, updateLead, refreshLeadAvatar, 
  fetchTags, addTagToLead, removeTagFromLead 
} from "@/lib/api";
import toast from "react-hot-toast";

interface ChatDetailsProps {
  lead: Lead | null;
  stages: Stage[];
}

export default function ChatDetails({ lead, stages }: ChatDetailsProps) {
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");

  useEffect(() => {
    if (lead) {
      setEditedLead(lead);
    }
  }, [lead]);

  useEffect(() => {
    fetchTags().then(setAllTags).catch(console.error);
  }, []);

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
    } catch (err) {
      console.error("Failed to update lead:", err);
      setEditedLead(lead); 
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setSaving(true);
    try {
      // Create new tag in DB
      const { createTag, addTagToLead } = await import("@/lib/api");
      const createdTag = await createTag({ name: newTagName, color: newTagColor });
      await addTagToLead(lead.id, createdTag.id);
      
      toast.success("Etiqueta criada e adicionada");
      setNewTagName("");
      setShowTagSelector(false);
      
      // Refresh tags and lead
      const updatedTags = await fetchTags();
      setAllTags(updatedTags);
      window.location.reload();
    } catch (err) {
      toast.error("Erro ao criar etiqueta");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExistingTag = async (tag: Tag) => {
    if (!lead) return;
    try {
      await addTagToLead(lead.id, tag.id);
      toast.success(`Tag ${tag.name} adicionada`);
      setShowTagSelector(false);
      window.location.reload();
    } catch (err) {
      toast.error("Erro ao adicionar tag");
    }
  };

  const handleMoveToFunnel = async (targetName: string) => {
    if (!lead) return;
    setSaving(true);
    try {
      const targetStage = stages.find(s => s.name.toLowerCase().includes(targetName.toLowerCase()));
      if (!targetStage) {
        toast.error(`Estágio ${targetName} não encontrado`);
        return;
      }
      await updateLead(lead.id, { stageId: targetStage.id });
      toast.success(`Movido para ${targetStage.name}`);
      window.location.reload();
    } catch (err) {
      toast.error("Erro ao mover lead");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToActiveFunnel = async () => {
     // User wants to go back to "before being archived". 
     // For now, if unknown, we'll go to the first stage of the active list
     const activeStages = stages.filter(s => 
        !["vendidos", "perdidos", "não leads"].includes(s.name.toLowerCase())
     );
     const firstStage = activeStages[0];
     if (firstStage) {
        await handleMoveToFunnel(firstStage.name);
     }
  };

  return (
    <div className="chat-details-container glass-panel">
      <div className="chat-details-header">
        <div 
          className="chat-details-avatar-editable shadow-glow" 
          style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          {lead.avatarUrl ? (
            <img src={lead.avatarUrl} alt={lead.name} className="w-full h-full object-cover" />
          ) : (
            <span>{lead.name.charAt(0).toUpperCase()}</span>
          )}
          
          <button 
            className="avatar-refresh-btn" 
            onClick={async () => {
              setSaving(true);
              try {
                await refreshLeadAvatar(lead.id);
                toast.success("Dados atualizados");
                window.location.reload();
              } catch (err) {
                toast.error("Erro ao sincronizar");
              } finally {
                setSaving(false);
              }
            }}
          >
            <RefreshCw size={12} className={saving ? "animate-spin" : ""} />
          </button>
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
          <button className="chat-action-card" onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}>
            <ExternalLink size={18} />
            <span>Perfil WA</span>
          </button>
          <button 
            className={`chat-action-card ${editedLead.isAgentActive ? 'active' : ''}`} 
            onClick={() => {
              const newValue = !editedLead.isAgentActive;
              handleChange("isAgentActive", newValue);
              setSaving(true);
              updateLead(lead.id, { isAgentActive: newValue })
                .then(() => toast.success(`IA ${newValue ? 'ON' : 'OFF'}`))
                .finally(() => setSaving(false));
            }}
          >
            <Bot size={18} />
            <span>IA: {editedLead.isAgentActive ? 'LIGADO' : 'DESLIGADO'}</span>
          </button>
        </div>
      </div>

      <div className="chat-details-content-scroll">
          <div className="chat-details-section">
            <h4 className="section-title">Dados Comerciais</h4>
            <div className="compact-grid">
              <div className="detail-item-v2">
                <label><Phone size={12} /> Telefone</label>
                <input value={editedLead.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} />
              </div>
              <div className="detail-item-v2">
                <label><DollarSign size={12} /> Valor estimado</label>
                <input type="number" value={editedLead.value || 0} onChange={(e) => handleChange("value", parseFloat(e.target.value))} onBlur={() => handleBlur("value")} />
              </div>
              <div className="detail-item-v2">
                <label><MapPin size={12} /> Localização</label>
                <input value={editedLead.city || ""} onChange={(e) => handleChange("city", e.target.value)} onBlur={() => handleBlur("city")} />
              </div>
              <div className="detail-item-v2">
                <label><Home size={12} /> Ambiente</label>
                <input value={editedLead.title || ""} onChange={(e) => handleChange("title", e.target.value)} onBlur={() => handleBlur("title")} />
              </div>
            </div>
          </div>

          <div className="chat-details-section">
            <h4 className="section-title">Qualificação</h4>
            <div className="detail-item-v2 full-width">
              <label><Target size={12} /> Nível de Qualificação</label>
              <input value={editedLead.phase || ""} onChange={(e) => handleChange("phase", e.target.value)} onBlur={() => handleBlur("phase")} placeholder="Ex: Chumbo Quente, Frio..." />
            </div>
          </div>

          <div className="chat-details-section">
            <h4 className="section-title"><Tags size={16} /> ETIQUETAS</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {lead.tags?.map(tag => (
                <span key={tag.id} className="tag-pill" style={{ backgroundColor: `${tag.color}22`, color: tag.color, borderColor: tag.color }}>
                  {tag.name}
                  <button onClick={() => removeTagFromLead(lead.id, tag.id).then(() => window.location.reload())} className="ml-1 hover:opacity-70"><X size={10} /></button>
                </span>
              ))}
              <button className="tag-pill-add" onClick={() => setShowTagSelector(!showTagSelector)}><Plus size={12} /> Adicionar etiqueta</button>
            </div>

            {showTagSelector && (
              <div className="tag-selector-popup glass-panel p-3">
                <div className="mb-3 border-b border-white/10 pb-3">
                  <p className="text-xs text-secondary mb-2 uppercase font-bold">Nova Etiqueta</p>
                  <div className="flex gap-2">
                    <input 
                       className="tag-input-field flex-1" 
                       placeholder="Nome..." 
                       value={newTagName}
                       onChange={(e) => setNewTagName(e.target.value)}
                    />
                    <input 
                      type="color" 
                      className="tag-color-picker" 
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                    />
                    <button className="tag-save-btn" onClick={handleCreateTag} disabled={!newTagName.trim()}><Plus size={14} /></button>
                  </div>
                </div>
                
                <div className="max-h-32 overflow-y-auto">
                   <p className="text-xs text-secondary mb-2 uppercase font-bold">Existentes</p>
                   <div className="grid grid-cols-2 gap-2">
                    {allTags
                      .filter(t => !lead.tags?.some(lt => lt.id === t.id))
                      .map(tag => (
                        <button key={tag.id} className="tag-select-item" style={{ borderColor: tag.color }} onClick={() => handleAddExistingTag(tag)}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></span>
                          {tag.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chat-details-section">
            <h4 className="section-title">Mover Funil</h4>
            <div className="funnel-mgmt-grid">
               <button className="funnel-btn active" onClick={handleResetToActiveFunnel}>
                  <Home size={14} /> Funil
               </button>
               <button className="funnel-btn won" onClick={() => handleMoveToFunnel("Vendidos")}>
                  <ShieldCheck size={14} /> Vendido
               </button>
               <button className="funnel-btn lost" onClick={() => handleMoveToFunnel("Perdidos")}>
                  <X size={14} /> Perdido
               </button>
               <button className="funnel-btn ghost" onClick={() => handleMoveToFunnel("Não Leads")}>
                  <Bot size={14} /> Não Lead
               </button>
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
            <button className="btn-primary-glow" disabled={saving} onClick={() => handleMoveToFunnel(nextStage.name)}>
              {saving ? "AVANÇANDO..." : `AVANÇAR PARA: ${nextStage.name.toUpperCase()}`}
              {!saving && <ArrowRight size={16} />}
            </button>
        ) : (
            <div className="max-stage-reached">🚀 Lead em estágio final</div>
        )}
      </div>
    </div>
  );
}
