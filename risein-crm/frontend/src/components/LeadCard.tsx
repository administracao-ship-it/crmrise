"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageCircle, Pencil, Trash2, CheckCircle, XCircle, UserMinus, Info } from "lucide-react";
import type { Lead } from "@/lib/api";

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
    onShowDetails: (lead: Lead) => void;
    onQuickMove: (leadId: string, targetStage: string) => void;
    onEdit: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatValue(value: number): string {
    if (!value) return "Sem valor";
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

function getAvatarColor(name: string): string {
    const colors = [
        "#0066ff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
        "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function LeadCard({ lead, onClick, onShowDetails, onQuickMove, onEdit, onDelete }: LeadCardProps) {
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
            stageId: lead.stageId,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const lastMessage = lead.messages?.[0];

    const formatDisplayName = (text: string) => {
        if (!text) return "";
        return text.split('@')[0];
    };

    const displayName = formatDisplayName(lead.name);
    const displayPhone = formatDisplayName(lead.phone);

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
                <div
                    className="lead-card-avatar"
                    style={{ background: lead.avatarUrl ? "transparent" : getAvatarColor(displayName) }}
                >
                    {lead.avatarUrl ? (
                        <img 
                            src={lead.avatarUrl} 
                            alt={displayName} 
                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                    const fallback = document.createElement('span');
                                    fallback.innerText = getInitials(displayName);
                                    parent.appendChild(fallback);
                                }
                            }}
                        />
                    ) : (
                        getInitials(displayName)
                    )}
                </div>
                <div className="lead-card-info">
                    <span className="lead-name">{displayName}</span>
                    <div className="lead-phone">{displayPhone}</div>
                    
                    {lead.tags && lead.tags.length > 0 && (
                        <div className="lead-card-tags">
                            {lead.tags.map(tag => (
                                <span 
                                    key={tag.id} 
                                    className="lead-card-tag-badge" 
                                    style={{ 
                                        color: tag.color, 
                                        backgroundColor: `${tag.color}15`,
                                        borderColor: `${tag.color}30`
                                    }}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="lead-actions">
                    <button
                        className="lead-action-btn edit"
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        title="Editar lead"
                    >
                        <Pencil size={12} />
                    </button>
                    <button
                        className="lead-action-btn delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                        title="Remover lead"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>

            <div className="lead-value-row">
                <span className={`lead-value ${!lead.value ? "no-value" : ""}`}>
                    {formatValue(lead.value)}
                </span>
                <span className="lead-date">{formatDate(lead.createdAt)}</span>
            </div>

            <div className="lead-quick-actions">
                 <button 
                    className="quick-action vendidos" 
                    title="Venda Realizada"
                    onClick={(e) => { e.stopPropagation(); onQuickMove(lead.id, "Vendidos"); }}
                >
                    <CheckCircle size={13} />
                </button>
                <button 
                    className="quick-action perdidos" 
                    title="Lead Perdido"
                    onClick={(e) => { e.stopPropagation(); onQuickMove(lead.id, "Perdidos"); }}
                >
                    <XCircle size={13} />
                </button>
                <button 
                    className="quick-action nao-leads" 
                    title="Não Lead"
                    onClick={(e) => { e.stopPropagation(); onQuickMove(lead.id, "Não Leads"); }}
                >
                    <UserMinus size={13} />
                </button>
                <div className="quick-action-divider" />
                <button 
                    className="quick-action details" 
                    title="Ver Detalhes (CRM)"
                    onClick={(e) => { e.stopPropagation(); onShowDetails(lead); }}
                >
                    <Info size={13} />
                </button>
            </div>

            {lastMessage && (
                <div className="lead-last-msg-bar">
                    <MessageCircle size={12} />
                    <span>{lastMessage.content}</span>
                </div>
            )}
        </div>
    );
}

export default React.memo(LeadCard);
