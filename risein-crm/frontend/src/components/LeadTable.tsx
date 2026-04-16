"use client";

import { Lead } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Phone, MapPin, Calendar, CheckCircle2, MoreHorizontal } from "lucide-react";

interface LeadTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export default function LeadTable({ leads, onLeadClick }: LeadTableProps) {
  const getStageColor = (stageName: string) => {
    const name = stageName.toUpperCase();
    if (name.includes("NOVO")) return "var(--accent-blue)";
    if (name.includes("CONTATO")) return "var(--accent-blue-light, #3b82f6)";
    if (name.includes("CALCULO") || name.includes("ORÇAMENTO")) return "var(--accent-cyan, #06b6d4)";
    if (name.includes("QUALIFICADOS")) return "var(--accent-red)";
    if (name.includes("VENDIDO")) return "var(--accent-green)";
    return "var(--text-muted)";
  };

  return (
    <div className="lead-table-container">
      <table className="lead-table">
        <thead>
          <tr>
            <th className="w-8">
              <input type="checkbox" className="custom-checkbox" />
            </th>
            <th>DATA CRIADA</th>
            <th>FECHADA EM</th>
            <th>ETAPA DO LEAD</th>
            <th>TELEFONE (CONTATO)</th>
            <th>CONTATO PRINCIPAL</th>
            <th>VENDA, R$</th>
            <th>LEAD TÍTULO</th>
            <th>FASE/MOMENTO</th>
            <th>CIDADE</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} onClick={() => onLeadClick(lead)} className="lead-row">
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="custom-checkbox" />
              </td>
              <td>
                <span>{formatDate(lead.createdAt)}</span>
              </td>
              <td>
                <span className={lead.closedAt ? "" : "text-muted"}>
                  {lead.closedAt ? formatDate(lead.closedAt) : "não fechado"}
                </span>
              </td>
              <td>
                <span 
                  className="stage-badge" 
                  style={{ backgroundColor: getStageColor(lead.stage?.name || "") }}
                >
                  {lead.stage?.name.toUpperCase() || "SEM ETAPA"}
                </span>
              </td>
              <td>
                <span className="phone-link">{lead.phone}</span>
              </td>
              <td>
                <span className="contact-name">{lead.name}</span>
              </td>
              <td>
                <span className={`lead-value ${lead.value === 0 ? "text-zero" : ""}`}>
                  {formatCurrency(lead.value)}
                </span>
              </td>
              <td>
                <div className="lead-title-cell">
                  <div className="dot" />
                  <span className="lead-title-text">{lead.title || lead.name}</span>
                </div>
              </td>
              <td>
                <span className="text-muted">{lead.phase || "-"}</span>
              </td>
              <td>
                <span className="text-muted">{lead.city || "-"}</span>
              </td>
              <td className="actions-cell">
                <button className="icon-btn">
                  <MoreHorizontal size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && (
        <div className="empty-state">
          <span>Nenhum lead encontrado</span>
        </div>
      )}
    </div>
  );
}
