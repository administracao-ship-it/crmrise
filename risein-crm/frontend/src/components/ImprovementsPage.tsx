"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Plus, Trash2, ImagePlus, Loader2, CheckCircle2, Clock, Wrench, X
} from "lucide-react";
import {
    fetchImprovements,
    createImprovement,
    updateImprovementStatus,
    deleteImprovement,
    ImprovementPoint,
    API_URL
} from "@/lib/api";

const STATUS_CONFIG = {
    Pendente: {
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.12)",
        icon: <Clock size={13} />,
        next: "Ajustando",
    },
    Ajustando: {
        color: "#0066ff",
        bg: "rgba(0,102,255,0.12)",
        icon: <Wrench size={13} />,
        next: "Finalizado",
    },
    Finalizado: {
        color: "#10b981",
        bg: "rgba(16,185,129,0.12)",
        icon: <CheckCircle2 size={13} />,
        next: null,
    },
};

export default function ImprovementsPage() {
    const [items, setItems] = useState<ImprovementPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const titleRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        try {
            const data = await fetchImprovements();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        const title = titleRef.current?.value.trim();
        if (!title) return;
        setSubmitting(true);

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", descRef.current?.value.trim() || "");
        if (fileRef.current?.files?.[0]) {
            formData.append("image", fileRef.current.files[0]);
        }

        try {
            const newItem = await createImprovement(formData);
            setItems(prev => [newItem, ...prev]);
            setShowModal(false);
            setImagePreview(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdvanceStatus = async (item: ImprovementPoint) => {
        const cfg = STATUS_CONFIG[item.status];
        if (!cfg.next) return;
        try {
            const updated = await updateImprovementStatus(item.id, cfg.next);
            setItems(prev => prev.map(i => i.id === item.id ? updated : i));
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover esta sugestão?")) return;
        try {
            await deleteImprovement(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImagePreview(url);
        }
    };

    const pendente = items.filter(i => i.status === "Pendente");
    const ajustando = items.filter(i => i.status === "Ajustando");
    const finalizado = items.filter(i => i.status === "Finalizado");

    return (
        <div style={{
            padding: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            minHeight: "100%"
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.5px" }}>
                        💡 Pontos de Melhoria
                    </h1>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Registre sugestões e acompanhe o progresso de cada uma.
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Plus size={16} />
                    Nova Sugestão
                </button>
            </div>

            {/* Stats bar */}
            <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
                {(["Pendente", "Ajustando", "Finalizado"] as const).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const count = items.filter(i => i.status === s).length;
                    return (
                        <div key={s} style={{
                            flex: 1, padding: "16px 20px",
                            background: cfg.bg,
                            border: `1px solid ${cfg.color}40`,
                            borderRadius: 8,
                            display: "flex", alignItems: "center", gap: 12
                        }}>
                            <div style={{ color: cfg.color }}>{cfg.icon}</div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{count}</div>
                                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "var(--text-muted)" }}>
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhuma sugestão ainda</div>
                    <div style={{ fontSize: 13 }}>Clique em "Nova Sugestão" para registrar a primeira melhoria.</div>
                </div>
            ) : (
                /* Kanban-style columns */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                    {(["Pendente", "Ajustando", "Finalizado"] as const).map(status => {
                        const cfg = STATUS_CONFIG[status];
                        const col = items.filter(i => i.status === status);
                        return (
                            <div key={status}>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
                                    padding: "8px 14px", background: cfg.bg,
                                    borderRadius: 6, border: `1px solid ${cfg.color}30`
                                }}>
                                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        {status}
                                    </span>
                                    <span style={{
                                        marginLeft: "auto", fontSize: 11, fontWeight: 700,
                                        background: `${cfg.color}25`, color: cfg.color,
                                        padding: "1px 8px", borderRadius: 10
                                    }}>{col.length}</span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {col.map(item => (
                                        <div key={item.id} style={{
                                            background: "var(--bg-card)",
                                            border: "1px solid var(--border-color)",
                                            borderRadius: 8,
                                            overflow: "hidden",
                                            transition: "box-shadow 0.2s",
                                        }}
                                            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)")}
                                            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                                        >
                                            {item.imageUrl && (
                                                <img
                                                    src={`${API_URL}${item.imageUrl}`}
                                                    alt="improvement"
                                                    style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }}
                                                />
                                            )}
                                            <div style={{ padding: "14px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                                                    <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
                                                        {item.title}
                                                    </h3>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        style={{
                                                            background: "transparent", border: "none", cursor: "pointer",
                                                            color: "var(--text-muted)", padding: 4, borderRadius: 4, flexShrink: 0
                                                        }}
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>

                                                {item.description && (
                                                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                                                        {item.description}
                                                    </p>
                                                )}

                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                                        {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                                                    </span>
                                                    {cfg.next && (
                                                        <button
                                                            onClick={() => handleAdvanceStatus(item)}
                                                            style={{
                                                                fontSize: 10, fontWeight: 700,
                                                                padding: "4px 10px", borderRadius: 4,
                                                                border: `1px solid ${STATUS_CONFIG[cfg.next as keyof typeof STATUS_CONFIG].color}`,
                                                                color: STATUS_CONFIG[cfg.next as keyof typeof STATUS_CONFIG].color,
                                                                background: STATUS_CONFIG[cfg.next as keyof typeof STATUS_CONFIG].bg,
                                                                cursor: "pointer", transition: "all 0.2s"
                                                            }}
                                                        >
                                                            → {cfg.next}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setImagePreview(null); }}>
                    <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h2 style={{ margin: 0 }}>💡 Nova Sugestão de Melhoria</h2>
                            <button onClick={() => { setShowModal(false); setImagePreview(null); }}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="form-group">
                            <label>Título *</label>
                            <input ref={titleRef} type="text" placeholder="Ex: Melhorar filtro de busca..." autoFocus />
                        </div>

                        <div className="form-group">
                            <label>Descrição</label>
                            <textarea ref={descRef} placeholder="Descreva a sugestão em detalhes..." rows={4} />
                        </div>

                        <div className="form-group">
                            <label>Imagem (opcional)</label>
                            <div
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    border: "2px dashed var(--border-color)", borderRadius: 8,
                                    padding: imagePreview ? 0 : "24px",
                                    cursor: "pointer", textAlign: "center",
                                    overflow: "hidden", transition: "border-color 0.2s"
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-blue)")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                                ) : (
                                    <div style={{ color: "var(--text-muted)" }}>
                                        <ImagePlus size={28} style={{ margin: "0 auto 8px" }} />
                                        <div style={{ fontSize: 13 }}>Clique para anexar um print/imagem</div>
                                        <div style={{ fontSize: 11, marginTop: 4 }}>PNG, JPG, WebP (máx. 10MB)</div>
                                    </div>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                        </div>

                        <div className="modal-actions" style={{ marginTop: 24 }}>
                            <button className="btn-secondary" onClick={() => { setShowModal(false); setImagePreview(null); }}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={handleCreate} disabled={submitting}
                                style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {submitting ? "Salvando..." : "Registrar Sugestão"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
