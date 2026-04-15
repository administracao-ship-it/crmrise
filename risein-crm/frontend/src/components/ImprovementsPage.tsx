"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Lightbulb, Plus, X, Image as ImageIcon, ChevronRight, ChevronLeft,
  Trash2, Loader2, Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

type Status = "Pendente" | "Ajustando" | "Finalizado";

interface Improvement {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: Status;
  createdAt: string;
}

const COLUMNS: { key: Status; label: string; icon: React.ReactNode; color: string; next?: Status; prev?: Status }[] = [
  { key: "Pendente",   label: "Solicitada", icon: <AlertCircle size={16} />,  color: "#f59e0b", next: "Ajustando" },
  { key: "Ajustando",  label: "Pendente",   icon: <Clock size={16} />,         color: "#4c96ff", prev: "Pendente",  next: "Finalizado" },
  { key: "Finalizado", label: "Concluído",  icon: <CheckCircle2 size={16} />, color: "#10b981", prev: "Ajustando" },
];

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
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const handleMove = async (id: string, newStatus: Status) => {
    try {
      const updated = await apiFetch(`/api/improvements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } catch {
      toast.error("Erro ao mover card");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/improvements/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = items.filter(i => i.status === col.key);
    return acc;
  }, {} as Record<Status, Improvement[]>);

  return (
    <div className="imp-root">
      {/* Header */}
      <div className="imp-header">
        <div>
          <h1 className="imp-title"><Lightbulb size={24} /> Melhorias do Sistema</h1>
          <p className="imp-subtitle">Registre sugestões e acompanhe o andamento de cada solicitação</p>
        </div>
        <button className="imp-add-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nova Solicitação
        </button>
      </div>

      {/* Board */}
      {loading ? (
        <div className="imp-loading"><Loader2 size={28} className="animate-spin" /> Carregando...</div>
      ) : (
        <div className="imp-board">
          {COLUMNS.map(col => (
            <div key={col.key} className="imp-column">
              <div className="imp-col-header" style={{ borderColor: col.color }}>
                <div className="imp-col-title-wrap" style={{ color: col.color }}>
                  {col.icon}
                  <span className="imp-col-title">{col.label}</span>
                </div>
                <span className="imp-col-count">{grouped[col.key].length}</span>
              </div>

              <div className="imp-cards">
                {grouped[col.key].length === 0 ? (
                  <div className="imp-empty">Nenhum item aqui</div>
                ) : (
                  grouped[col.key].map(item => (
                    <div key={item.id} className="imp-card">
                      {item.imageUrl && (
                        <div className="imp-card-img-wrap">
                          <img src={item.imageUrl} alt={item.title} className="imp-card-img" />
                        </div>
                      )}
                      <div className="imp-card-body">
                        <p className="imp-card-title">{item.title}</p>
                        {item.description && (
                          <p className="imp-card-desc">{item.description}</p>
                        )}
                        <p className="imp-card-date">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="imp-card-actions">
                        {col.prev && (
                          <button
                            className="imp-move-btn imp-move-prev"
                            onClick={() => handleMove(item.id, col.prev!)}
                            title={`Mover para ${COLUMNS.find(c => c.key === col.prev)?.label}`}
                          >
                            <ChevronLeft size={14} />
                          </button>
                        )}
                        <button
                          className="imp-delete-btn"
                          onClick={() => handleDelete(item.id)}
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </button>
                        {col.next && (
                          <button
                            className="imp-move-btn imp-move-next"
                            onClick={() => handleMove(item.id, col.next!)}
                            title={`Mover para ${COLUMNS.find(c => c.key === col.next)?.label}`}
                          >
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="imp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="imp-modal" onClick={e => e.stopPropagation()}>
            <div className="imp-modal-header">
              <h2 className="imp-modal-title"><Lightbulb size={20} /> Nova Solicitação de Melhoria</h2>
              <button className="imp-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="imp-modal-body">
              <div className="imp-field">
                <label className="imp-label">Título *</label>
                <input
                  className="imp-input"
                  placeholder="Ex: Adicionar filtro por data no relatório..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="imp-field">
                <label className="imp-label">Descrição</label>
                <textarea
                  className="imp-textarea"
                  placeholder="Descreva o problema ou a melhoria desejada com detalhes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="imp-field">
                <label className="imp-label">Imagem (opcional)</label>
                <div
                  className="imp-upload-zone"
                  onClick={() => fileRef.current?.click()}
                >
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
                    <div className="imp-upload-placeholder">
                      <ImageIcon size={28} opacity={0.4} />
                      <p>Clique para anexar uma imagem</p>
                      <span>PNG, JPG ou WEBP • Máx. 10MB</span>
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
                {saving ? "Enviando..." : "Enviar Solicitação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
