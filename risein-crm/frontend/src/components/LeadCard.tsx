"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import type { Lead } from "@/lib/api";

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
    onEdit: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatValue(value: number): string {
    if (!value) return "No value";
    return `R$${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function LeadCard({ lead, onClick, onEdit, onDelete }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: lead.id, 
        data: { 
            type: "lead",
            lead,
            stageId: lead.stageId 
        } 
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const lastMessage = lead.messages?.[0];

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`lead-card ${isDragging ? "dragging" : ""}`}
            onClick={() => onClick(lead)}
        >
            <div className="lead-card-header">
                <span className="lead-name">{lead.name}</span>
                <div className="lead-actions">
                    <button 
                        className="lead-action-btn edit" 
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        title="Editar nome"
                    >
                        <Pencil size={12} />
                    </button>
                    <button 
                        className="lead-action-btn delete" 
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                        title="Remover lead"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            <div className="lead-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div className="lead-date">{formatDate(lead.createdAt)}</div>
                <div className={`lead-value ${!lead.value ? "no-value" : ""}`} style={{ marginBottom: 0 }}>
                    {formatValue(lead.value)}
                </div>
            </div>

            <div className="lead-phone">{lead.phone}</div>

            {lastMessage && (
                <div className="lead-footer">
                    <div className="lead-avatar">{getInitials(lead.name)}</div>
                    <div className="lead-last-msg">
                        <MessageCircle size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                        {lastMessage.content}
                    </div>
                </div>
            )}
        </div>
    );
}
