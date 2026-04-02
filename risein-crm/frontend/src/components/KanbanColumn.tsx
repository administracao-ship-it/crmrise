"use client";

import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import LeadCard from "./LeadCard";
import { Inbox, Pencil } from "lucide-react";
import type { Lead, Stage } from "@/lib/api";

interface KanbanColumnProps {
    id: string;
    title: string;
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onEditStage: (stage: { id: string, name: string }) => void;
    onEditLead: (lead: Lead) => void;
    onDeleteLead: (lead: Lead) => void;
}

export default function KanbanColumn({
    id,
    title,
    leads,
    onLeadClick,
    onEditStage,
    onEditLead,
    onDeleteLead,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ 
        id,
        data: {
            type: "stage",
            stageId: id,
        }
    });

    return (
        <div
            ref={setNodeRef}
            className="kanban-column"
            style={{
                borderTop: isOver ? "2px solid var(--accent-blue)" : "2px solid transparent",
            }}
        >
            <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="column-title">{title}</span>
                    <button 
                        className="btn-edit-funnel"
                        style={{ opacity: 1, background: "transparent" }}
                        onClick={() => onEditStage({ id, name: title })}
                        title="Editar"
                    >
                        <Pencil size={12} />
                    </button>
                </div>
                <span className="column-count">
                    {leads.length}
                </span>
            </div>
            <div className="kanban-column-body">
                <SortableContext
                    items={leads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.length === 0 ? (
                        <div className="empty-column">
                            <Inbox size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                            <span>Nenhum lead nesta etapa</span>
                        </div>
                    ) : (
                        leads.map((lead) => (
                            <LeadCard 
                                key={lead.id} 
                                lead={lead} 
                                onClick={onLeadClick} 
                                onEdit={onEditLead}
                                onDelete={onDeleteLead}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    );
}
