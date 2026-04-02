"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createLead } from "@/lib/api";
import type { Stage, Lead } from "@/lib/api";

interface NewLeadModalProps {
    stages: Stage[];
    onClose: () => void;
    onCreated: (lead: Lead) => void;
    initialStageId?: string;
}

export default function NewLeadModal({
    stages,
    onClose,
    onCreated,
    initialStageId,
}: NewLeadModalProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [value, setValue] = useState("");
    const [title, setTitle] = useState("");
    const [phase, setPhase] = useState("");
    const [city, setCity] = useState("");
    const [stageId, setStageId] = useState(initialStageId || (stages[0]?.id || ""));
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !stageId) return;
        setLoading(true);
        try {
            const lead = await createLead({
                name,
                phone,
                value: value ? parseFloat(value) : 0,
                stageId,
                title,
                phase,
                city,
            });
            onCreated(lead);
            onClose();
        } catch (err) {
            console.error("Failed to create lead:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h2>+ Novo Lead</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome</label>
                        <input
                            type="text"
                            placeholder="Nome do contato"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Telefone</label>
                        <input
                            type="text"
                            placeholder="+55 32 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Valor (R$)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            step="0.01"
                        />
                    </div>
                    <div className="form-group">
                        <label>Título do Lead</label>
                        <input
                            type="text"
                            placeholder="Ex: Lead #123"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Fase / Momento</label>
                        <input
                            type="text"
                            placeholder="Ex: Qualificação"
                            value={phase}
                            onChange={(e) => setPhase(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Cidade</label>
                        <input
                            type="text"
                            placeholder="Ex: São Paulo"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Etapa</label>
                        <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                            {stages.map((stage) => (
                                <option key={stage.id} value={stage.id}>
                                    {stage.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? "Salvando..." : "Criar Lead"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
