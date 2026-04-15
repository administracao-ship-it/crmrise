"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Lightbulb, Plus, X, Image as ImageIcon, ChevronRight, ChevronLeft,
  Trash2, Loader2, Clock, CheckCircle2, AlertCircle, Calendar, FileText, ZoomIn,
  Archive, ArchiveRestore, Eye, EyeOff, Paperclip, MoreVertical
} from "lucide-react";
import toast from "react-hot-toast";

type Status = "Pendente" | "Ajustando" | "Finalizado";

interface Improvement {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: Status;
  archived: boolean;
  createdAt: string;
}

const COLUMNS: { key: Status; label: string; icon: React.ReactNode; color: string; next?: Status; prev?: Status }[] = [
  { key: "Pendente",   label: "Solicitada", icon: <AlertCircle size={14} />,  color: "#f59e0b", next: "Ajustando" },
  { key: "Ajustando",  label: "Pendente",   icon: <Clock size={14} />,         color: "#34b7f1", prev: "Pendente",  next: "Finalizado" },
  { key: "Finalizado", label: "Concluído",  icon: <CheckCircle2 size={14} />, color: "#00a884", prev: "Ajustando" },
];

const STATUS_MAP: Record<Status, { label: string; color: string }> = {
  Pendente:   { label: "Solicitada", color: "#f59e0b" },
  Ajustando:  { label: "Pendente",   color: "#34b7f1" },
  Finalizado: { label: "Concluído",  color: "#00a884" },
};

const API = "";

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(`${API}${url}`, opts);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export default function ImprovementsPage() {
  const [items, setItems] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Improvement | null>(null);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Create form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/improvements");
      setItems(data);
    } catch {
      toast.error("Erro ao carregar melhorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Informe um título"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      if (imageFile) fd.append("image", imageFile);

      const item = await apiFetch("/api/improvements", { method: "POST", body: fd });
      setItems(prev => [item, ...prev]);
      toast.success("Solicitação enviada!");
      setTitle(""); setDescription(""); setImageFile(null); setImagePreview(null);
      setShowModal(false);
    } catch {
      toast.error("Erro ao criar solicitação");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Improvement>) => {
    try {
      const updated = await apiFetch(`/api/improvements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      if (selectedItem?.id === id) setSelectedItem(updated);
      
      if (updates.archived === true) toast.success("Item arquivado");
      if (updates.archived === false) toast.success("Item restaurado");
    } catch {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente?")) return;
    try {
      await apiFetch(`/api/improvements/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      toast.success("Removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const visibleItems = items.filter(i => i.archived === showArchived);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = visibleItems.filter(i => i.status === col.key);
    return acc;
  }, {} as Record<Status, Improvement[]>);

  const selectedCol = selectedItem ? COLUMNS.find(c => c.key === selectedItem.status) : null;

  return (
    <div className="imp-root trello-style">
      {/* Header */}
      <div className="imp-header">
        <div className="imp-header-left">
          <h1 className="imp-title"><Lightbulb size={24} /> Melhorias do Sistema</h1>
          <p className="imp-subtitle">Estilo Trello para gestão de sugestões e bugs</p>
        </div>
        <div className="imp-header-actions">
          <button 
            className={`imp-btn-toggle ${showArchived ? "active" : ""}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <Eye size={18} /> : <Archive size={18} />}
            {showArchived ? "Ver Ativos" : "Ver Arquivados"}
            {items.filter(i => i.archived).length > 0 && !showArchived && (
              <span className="imp-count-badge">{items.filter(i => i.archived).length}</span>
            )}
          </button>
          <button className="imp-add-btn" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Nova Solicitação
          </button>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="imp-loading"><Loader2 size={28} className="animate-spin" /> Carregando...</div>
      ) : (
        <div className="imp-board">
          {COLUMNS.map(col => (
            <div key={col.key} className="imp-column trello-col">
              <div className="imp-col-header trello-col-header" style={{ borderTopColor: col.color }}>
                <div className="imp-col-title-wrap">
                  {col.icon}
                  <span className="imp-col-title">{col.label}</span>
                </div>
                <span className="imp-col-count">{grouped[col.key].length}</span>
              </div>

              <div className="imp-cards-container">
                {grouped[col.key].length === 0 ? (
                  <div className="imp-empty-trello">Sem itens</div>
                ) : (
                  grouped[col.key].map(item => (
                    <div key={item.id} className="imp-card trello-card" onClick={() => setSelectedItem(item)}>
                      <div className="imp-card-content">
                        <p className="imp-card-title-trello">{item.title}</p>
                        
                        <div className="imp-card-meta">
                          <div className="imp-meta-left">
                            <span className="imp-card-date-trello">
                              {new Date(item.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}
                            </span>
                            {item.imageUrl && (
                              <span className="imp-attachment-badge">
                                <Paperclip size={10} />
                              </span>
                            )}
                          </div>
                          <div className="imp-meta-right">
                             {item.description && <FileText size={12} className="opacity-40" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="imp-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="imp-modal imp-modal-detail trello-modal" onClick={e => e.stopPropagation()}>
            <div className="imp-modal-header">
              <div className="imp-detail-header-left">
                <h2 className="imp-modal-title">
                  <FileText size={20} />
                  Detalhes
                </h2>
                <div 
                  className="imp-detail-status-badge"
                  style={{
                    color: STATUS_MAP[selectedItem.status].color,
                    background: `${STATUS_MAP[selectedItem.status].color}20`,
                  }}
                >
                  {STATUS_MAP[selectedItem.status].label}
                </div>
              </div>
              <div className="imp-modal-header-actions">
                <button 
                  className="imp-action-icon-btn" 
                  onClick={() => handleUpdate(selectedItem.id, { archived: !selectedItem.archived })}
                  title={selectedItem.archived ? "Restaurar" : "Arquivar"}
                >
                  {selectedItem.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                </button>
                <button className="imp-modal-close" onClick={() => setSelectedItem(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="imp-modal-body">
              {/* Title Section */}
              <div className="imp-detail-section">
                <p className="imp-detail-label">Título</p>
                <p className="imp-detail-value-main">{selectedItem.title}</p>
              </div>

              {/* Description Section */}
              <div className="imp-detail-section">
                <p className="imp-detail-label">Descrição</p>
                <p className="imp-detail-description">
                  {selectedItem.description || "Sem descrição adicional."}
                </p>
              </div>

              {/* Image Section */}
              {selectedItem.imageUrl && (
                <div className="imp-detail-section">
                  <p className="imp-detail-label">Anexo</p>
                  <div
                    className="imp-detail-img-wrap-trello"
                    onClick={() => setLightboxImg(selectedItem.imageUrl!)}
                  >
                    <img src={selectedItem.imageUrl} alt={selectedItem.title} className="imp-detail-img" />
                    <div className="imp-detail-img-overlay">
                      <ZoomIn size={24} />
                      <span>Clique para ampliar</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Section */}
              <div className="imp-detail-section">
                <p className="imp-detail-label">Criado em</p>
                <p className="imp-detail-date">
                  {new Date(selectedItem.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "long", year: "numeric", hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="imp-modal-footer imp-detail-footer-trello">
              <div className="imp-detail-move-row">
                {selectedCol?.prev && (
                  <button
                    className="imp-detail-move-btn"
                    onClick={() => handleUpdate(selectedItem.id, { status: selectedCol.prev! })}
                  >
                    <ChevronLeft size={16} /> Voltar
                  </button>
                )}
                
                <button className="imp-btn-delete-trello" onClick={() => handleDelete(selectedItem.id)}>
                   Excluir
                </button>

                {selectedCol?.next && (
                  <button
                    className="imp-detail-move-btn"
                    onClick={() => handleUpdate(selectedItem.id, { status: selectedCol.next! })}
                  >
                    Avançar <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="imp-lightbox" onClick={() => setLightboxImg(null)}>
          <button className="imp-lightbox-close" onClick={() => setLightboxImg(null)}>
            <X size={24} />
          </button>
          <img src={lightboxImg} alt="Zoom" className="imp-lightbox-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="imp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="imp-modal trello-modal" onClick={e => e.stopPropagation()}>
            <div className="imp-modal-header">
              <h2 className="imp-modal-title"><Lightbulb size={20} /> Nova Melhoria</h2>
              <button className="imp-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="imp-modal-body">
              <div className="imp-field">
                <label className="imp-label">O que deseja sugerir? *</label>
                <input
                  className="imp-input"
                  placeholder="Título da melhoria..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="imp-field">
                <label className="imp-label">Detalhes</label>
                <textarea
                  className="imp-textarea"
                  placeholder="Explique com mais detalhes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="imp-field">
                <label className="imp-label">Anexar Imagem</label>
                <div className="imp-upload-zone-trello" onClick={() => fileRef.current?.click()}>
                  {imagePreview ? (
                    <div className="imp-preview-wrap">
                      <img src={imagePreview} alt="preview" className="imp-preview-img" />
                      <button
                        className="imp-preview-remove"
                        onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="imp-upload-placeholder-trello">
                      <ImageIcon size={24} opacity={0.4} />
                      <p>Anexar captura de tela</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
              </div>
            </div>

            <div className="imp-modal-footer">
              <button className="imp-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="imp-btn-submit" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? "Criando..." : "Criar Melhoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
