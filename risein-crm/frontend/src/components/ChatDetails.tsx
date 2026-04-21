"use client";

import { useState, useEffect, useRef } from "react";
import { 
  User, Phone, DollarSign, Calendar, MapPin, 
  ExternalLink, ShieldCheck, Home, Target, ArrowRight, Bot, RefreshCw,
  Tags, X, Plus, ChevronLeft, MoreHorizontal, Instagram, MessageSquare, Briefcase, Mail, Info, Check
} from "lucide-react";
import { 
  type Lead, type Stage, type Tag, updateLead, refreshLeadAvatar, 
  fetchTags, addTagToLead, removeTagFromLead, createTag 
} from "@/lib/api";
import toast from "react-hot-toast";

interface ChatDetailsProps {
  lead: Lead | null;
  stages: Stage[];
}

type TabType = "Principal" | "Estatísticas" | "Mídia" | "Products" | "Configurações" | "Histórico";

export default function ChatDetails({ lead, stages }: ChatDetailsProps) {
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [activeTab, setActiveTab] = useState<TabType>("Principal");
  const tagSelectorRef = useRef<HTMLDivElement>(null);

  // Virtual fields state for UI completeness
  const [virtualFields, setVirtualFields] = useState({
    responsible: "Lidiane",
    forecast: "",
    origin: "Rise | Thiago | Meta",
    instagram: "",
    designer: "",
    campaign: "",
    notes: "",
    service: "",
    intent_env: "",
    intent_value: "",
    search_prime: "",
    presentation: "",
    agency: "",
    rise_no: "",
    company: "",
    email_work: "",
    position: "",
    user_terms: false
  });

  useEffect(() => {
    if (lead) {
      setEditedLead(lead);
    }
  }, [lead]);

  useEffect(() => {
    fetchTags().then(setAllTags).catch(console.error);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagSelectorRef.current && !tagSelectorRef.current.contains(event.target as Node)) {
        setShowTagSelector(false);
      }
    }
    if (showTagSelector) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTagSelector]);

  if (!lead) return (
    <div className="chat-details-empty">
      <User size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
      <p>Selecione um contato para ver detalhes</p>
    </div>
  );

  const currentStage = stages.find(s => s.id === lead.stageId);
  const activeStages = stages.filter(s => !["vendidos", "perdidos", "não leads"].includes(s.name.toLowerCase()));
  const currentStageIndex = activeStages.findIndex(s => s.id === lead.stageId);

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

  const renderField = (label: string, value: any, onChange: (val: any) => void, onBlur?: () => void, type: string = "text", options?: string[]) => (
    <div className="wa-field-row">
      <div className="wa-field-label">{label}</div>
      <div className="wa-field-value">
        {options ? (
          <select value={value || ""} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
            <option value="">Selecione</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : type === "date" ? (
          <div className="flex items-center gap-2">
             <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
          </div>
        ) : (
          <input 
            type={type} 
            value={value === undefined || value === null ? "" : value} 
            onChange={(e) => onChange(e.target.value)} 
            onBlur={onBlur}
            placeholder="..."
          />
        )}
      </div>
    </div>
  );

  const handleRefreshAvatar = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      await refreshLeadAvatar(lead.id);
      toast.success("Foto atualizada!");
    } catch (err) {
      toast.error("Erro ao atualizar foto");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTag = async (tagId: string) => {
    if (!lead) return;
    const isAssigned = lead.tags?.some(t => t.id === tagId);
    
    setSaving(true);
    try {
      const updatedLead = isAssigned 
        ? await removeTagFromLead(lead.id, tagId)
        : await addTagToLead(lead.id, tagId);
      
      setEditedLead(updatedLead);
      toast.success(isAssigned ? "Tag removida" : "Tag adicionada");
    } catch (err) {
      toast.error("Erro ao atualizar tag");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!lead || !newTagName.trim()) return;
    
    setSaving(true);
    try {
      const newTag = await createTag({ name: newTagName, color: newTagColor });
      setAllTags(prev => [...prev, newTag]);
      
      const updatedLead = await addTagToLead(lead.id, newTag.id);
      setEditedLead(updatedLead);
      
      setNewTagName("");
      setShowTagSelector(false);
      toast.success("Tag criada e adicionada!");
    } catch (err) {
      toast.error("Erro ao criar tag");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wa-contact-info">
      {/* Header Bitrix Style */}
      <div className="wa-details-header-v2">
        <div className="wa-details-back-row">
          <ChevronLeft size={18} />
          <span>Lead #{lead.id.slice(-8).toUpperCase()}</span>
          <div className="ml-auto flex items-center gap-3 opacity-60">
            <RefreshCw 
              size={16} 
              className="cursor-pointer hover:text-accent-blue transition-colors" 
              onClick={handleRefreshAvatar} 
            />
            <MoreHorizontal size={18} className="cursor-pointer" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3 relative">
            {editedLead.tags?.map(tag => (
                <span 
                    key={tag.id} 
                    className="tag-pill cursor-pointer hover:opacity-80 transition-all flex items-center gap-1" 
                    style={{ 
                        backgroundColor: `${tag.color || '#3b82f6'}22`, 
                        color: tag.color || '#3b82f6', 
                        borderColor: tag.color || '#3b82f6', 
                        fontSize: '10px', 
                        padding: '2px 8px' 
                    }}
                    onClick={() => handleToggleTag(tag.id)}
                    title="Clique para remover"
                >
                    #{tag.name}
                    <X size={10} />
                </span>
            ))}
            <button className="tag-pill-add" onClick={() => setShowTagSelector(!showTagSelector)} style={{ fontSize: '10px' }}>
                {showTagSelector ? <X size={12} /> : <Plus size={12} />}
            </button>

            {showTagSelector && (
                <div 
                  ref={tagSelectorRef}
                  className="tag-selector-popup glass-panel shadow-glow absolute top-full left-0 z-50 mt-2 w-64 p-3 bg-bg-card border border-border-color rounded-xl animate-fade-in"
                >
                    <div className="flex items-center gap-2 mb-3 bg-black/20 rounded-lg p-2 border border-white/5">
                        <Target size={14} className="text-accent-blue" />
                        <input 
                            type="text" 
                            className="bg-transparent border-none text-xs w-full focus:outline-none" 
                            placeholder="Buscar ou criar tag..." 
                            value={tagSearch}
                            onChange={(e) => {
                                setTagSearch(e.target.value);
                                if (!showTagSelector) setShowTagSelector(true);
                            }}
                        />
                    </div>

                    <div className="max-height-[150px] overflow-y-auto mb-3 flex flex-col gap-1">
                        {allTags
                            .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                            .map(tag => {
                                const isSelected = editedLead.tags?.some(t => t.id === tag.id);
                                return (
                                    <button 
                                        key={tag.id}
                                        className={`tag-select-item ${isSelected ? 'bg-accent-blue/10 border-accent-blue/20' : ''}`}
                                        onClick={() => handleToggleTag(tag.id)}
                                    >
                                        <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: tag.color || '#3b82f6' }}
                                        />
                                        <span className="flex-1">{tag.name}</span>
                                        {isSelected && <Check size={12} className="text-accent-blue" />}
                                    </button>
                                );
                            })}
                    </div>

                    {tagSearch && !allTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                        <div className="border-t border-white/5 pt-3 mt-2">
                            <div className="text-[10px] uppercase font-bold text-muted mb-2">Criar nova tag</div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    className="tag-color-picker" 
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                />
                                <button 
                                    className="flex-1 py-2 bg-accent-blue text-white rounded-lg text-xs font-bold hover:bg-accent-blue/80 transition-colors"
                                    onClick={() => {
                                        setNewTagName(tagSearch);
                                        handleCreateAndAddTag();
                                    }}
                                >
                                    Criar "#{tagSearch}"
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="wa-stage-progress-container">
            <div className="wa-stage-name-row">
                <span>Funil de vendas</span>
                <div className="flex items-center gap-2">
                    <span className="opacity-80">{currentStage?.name}</span>
                    <span className="opacity-40 text-[9px]">(1 day)</span>
                    <ChevronLeft className="rotate-180" size={12} />
                </div>
            </div>
            <div className="wa-stage-progress-bar">
                {activeStages.map((s, i) => (
                    <div 
                        key={s.id} 
                        className={`wa-stage-segment ${i < currentStageIndex ? 'completed' : i === currentStageIndex ? 'active' : ''}`}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="wa-details-tabs">
        {(["Principal", "Estatísticas", "Mídia", "Products", "Configurações", "Histórico"] as TabType[]).map(tab => (
          <button 
            key={tab} 
            className={`wa-details-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="wa-details-content-v2 wa-scroll">
        {activeTab === "Principal" && (
          <>
            <div className="wa-section">
              {renderField("Usuário responsável", virtualFields.responsible, (v) => setVirtualFields(prev => ({...prev, responsible: v})))}
              {renderField("Venda", editedLead.value, (v) => handleChange("value", parseFloat(v)), () => handleBlur("value"), "number")}
              {renderField("Forecast", virtualFields.forecast, (v) => setVirtualFields(prev => ({...prev, forecast: v})), undefined, "date")}
              {renderField("Origem do Lead", virtualFields.origin, (v) => setVirtualFields(prev => ({...prev, origin: v})), undefined, "text", ["Rise | Thiago | Meta", "Indicação", "Google", "Outro"])}
              {renderField("Instagram", virtualFields.instagram, (v) => setVirtualFields(prev => ({...prev, instagram: v})))}
              {renderField("Projetista Responsável", virtualFields.designer, (v) => setVirtualFields(prev => ({...prev, designer: v})), undefined, "text", ["Lidiane", "Carlos", "Ana"])}
              {renderField("Campanha", virtualFields.campaign, (v) => setVirtualFields(prev => ({...prev, campaign: v})))}
              {renderField("Anotações", virtualFields.notes, (v) => setVirtualFields(prev => ({...prev, notes: v})))}
              {renderField("Atendimento", virtualFields.service, (v) => setVirtualFields(prev => ({...prev, service: v})))}
              {renderField("Que ambiente deseja plane", editedLead.title, (v) => handleChange("title", v), () => handleBlur("title"))}
              {renderField("Quanto pretende investir?", virtualFields.intent_value, (v) => setVirtualFields(prev => ({...prev, intent_value: v})))}
              {renderField("O que você busca no prime", virtualFields.search_prime, (v) => setVirtualFields(prev => ({...prev, search_prime: v})), undefined, "text", ["Qualidade", "Preço", "Prazo"])}
              {renderField("Apresentação", virtualFields.presentation, (v) => setVirtualFields(prev => ({...prev, presentation: v})), undefined, "date")}
              {renderField("Agência", virtualFields.agency, (v) => setVirtualFields(prev => ({...prev, agency: v})), undefined, "text", ["Agência A", "Agência B"])}
              {renderField("Nº RISE", virtualFields.rise_no, (v) => setVirtualFields(prev => ({...prev, rise_no: v})))}
            </div>

            <div className="wa-section-header">CONTATO</div>
            
            <div className="wa-contact-card-mini">
               <div className="wa-contact-avatar-mini">
                  {lead.avatarUrl ? <img src={lead.avatarUrl} alt={lead.name} className="w-full h-full object-cover" /> : <User size={20} />}
               </div>
               <div className="wa-contact-info-mini">
                  <h5>{editedLead.name}</h5>
                  <div className="wa-wa-badge-mini">
                     <Check size={10} /> WhatsApp Business
                  </div>
               </div>
            </div>

            <div className="wa-section">
                {renderField("Empresa", virtualFields.company, (v) => setVirtualFields(prev => ({...prev, company: v})))}
                <div className="wa-field-row">
                    <div className="wa-field-label">Tel comercial</div>
                    <div className="wa-field-value flex items-center gap-2">
                        <Plus size={12} className="opacity-50" />
                        <span className="text-accent-blue underline cursor-pointer" onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}>
                            {editedLead.phone}
                        </span>
                    </div>
                </div>
                {renderField("E-mail comercial", virtualFields.email_work, (v) => setVirtualFields(prev => ({...prev, email_work: v})))}
                {renderField("Posição", virtualFields.position, (v) => setVirtualFields(prev => ({...prev, position: v})))}
                <div className="wa-field-row">
                    <div className="wa-field-label">User terms</div>
                    <div className="wa-field-value">
                        <div 
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${virtualFields.user_terms ? 'bg-accent-blue border-accent-blue' : 'border-white/20'}`}
                          onClick={() => setVirtualFields(prev => ({...prev, user_terms: !prev.user_terms}))}
                        >
                            {virtualFields.user_terms && <Check size={12} color="white" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="wa-details-actions-v2">
                <button className="wa-add-btn-v2"><Plus size={14} /> Adicionar contato</button>
            </div>
            <div className="wa-details-actions-v2" style={{ marginTop: '8px' }}>
                <button className="wa-add-btn-v2"><Plus size={14} /> Adicionar empresa</button>
            </div>
          </>
        )}

        {activeTab === "Mídia" && (
            <div className="p-4 text-center opacity-50">
                <p>Nenhuma mídia encontrada</p>
            </div>
        )}

        {activeTab === "Histórico" && (
            <div className="p-4">
                <div className="history-pill mb-3">
                    <Calendar size={12} />
                    <span>Entrou no funil em {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="history-pill">
                    <RefreshCw size={12} />
                    <span>Última atualização: {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
        )}

        {activeTab === "Configurações" && (
            <div className="p-4">
                <button 
                    className={`wa-action-btn w-full mb-3 ${editedLead.isAgentActive ? 'active' : ''}`} 
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
                    <span>Inteligência Artificial: {editedLead.isAgentActive ? 'LIGADA' : 'DESLIGADA'}</span>
                </button>
            </div>
        )}
      </div>

      {/* Floating Saver if saving */}
      {saving && (
        <div className="absolute top-4 right-4 animate-spin">
          <RefreshCw size={16} color="var(--accent-blue)" />
        </div>
      )}
    </div>
  );
}

