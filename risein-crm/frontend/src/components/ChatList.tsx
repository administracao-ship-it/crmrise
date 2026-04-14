"use client";

import { Search, CheckCircle2, Trash2, Bot } from "lucide-react";
import type { Lead } from "@/lib/api";
import { deleteLead } from "@/lib/api";
import toast from "react-hot-toast";

interface ChatListProps {
  leads: Lead[];
  selectedLeadId?: string;
  onSelectLead: (lead: Lead) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function ChatList({ 
  leads, 
  selectedLeadId, 
  onSelectLead,
  searchQuery,
  onSearchChange
}: ChatListProps) {

  const handleDelete = async (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (!window.confirm(`Deseja excluir permanentemente o lead "${lead.name}"?`)) return;
    
    try {
      await deleteLead(lead.id);
      toast.success("Lead excluído");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir lead");
    }
  };

  const formatChatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
  };

  return (
    <div className="chat-list-container">
      <div className="chat-list-search">
        <Search size={16} />
        <input 
          type="text" 
          placeholder="Buscar conversas..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="chat-list-scroll">
        {leads.length === 0 ? (
          <div className="chat-list-empty">Nenhum contato encontrado</div>
        ) : (
          leads.map((lead) => (
            <div 
              key={lead.id}
              className={`chat-list-item ${selectedLeadId === lead.id ? 'active' : ''}`}
              onClick={() => onSelectLead(lead)}
              style={{ borderLeft: selectedLeadId === lead.id ? '4px solid #3b82f6' : '4px solid transparent' }}
            >
              <div className="chat-avatar-container">
                <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '15px', fontWeight: 600 }}>
                   {lead.name.charAt(0).toUpperCase()}
                   {lead.isAgentActive && (
                     <div className="ai-badge-mini" title="IA Ativa">
                       <Bot size={10} />
                     </div>
                   )}
                </div>
              </div>
              
              <div className="chat-item-info">
                <div className="chat-item-header">
                  <span className="chat-item-name">{lead.name}</span>
                  <span className="chat-item-time">
                    {formatChatTime(lead.messages && lead.messages.length > 0 ? lead.messages[0].timestamp : lead.createdAt)}
                  </span>
                </div>
                <div className="chat-item-footer">
                  <p className="chat-item-last-msg">
                    {lead.messages && lead.messages.length > 0 
                      ? lead.messages[0].content 
                      : "Nenhuma mensagem ainda"}
                  </p>
                  <div className="chat-item-actions">
                    <button 
                      className="chat-delete-btn"
                      onClick={(e) => handleDelete(e, lead)}
                      title="Excluir Lead"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
