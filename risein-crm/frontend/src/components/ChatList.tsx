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
    <div className="chat-list-container wa-chat-list">
      <div className="chat-list-search-wa">
        <div className="search-input-wrapper-wa">
          <Search size={16} className="search-icon-wa" />
          <input 
            type="text" 
            placeholder="Pesquisar ou começar uma nova conversa" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      
      <div className="chat-list-scroll wa-scroll">
        {leads.length === 0 ? (
          <div className="chat-list-empty">Nenhum contato encontrado</div>
        ) : (
          leads.map((lead) => (
            <div 
              key={lead.id}
              className={`wa-chat-item ${selectedLeadId === lead.id ? 'active' : ''}`}
              onClick={() => onSelectLead(lead)}
            >
              <div className="wa-avatar-container">
                <div className="wa-avatar">
                   {lead.avatarUrl ? (
                     <img 
                       src={lead.avatarUrl} 
                       alt={lead.name}
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     <div className="w-full h-full bg-[#6a7175] flex items-center justify-center text-white text-lg font-medium">
                        {lead.name.charAt(0).toUpperCase()}
                     </div>
                   )}
                   
                   {lead.isAgentActive && (
                     <div className="wa-ai-badge" title="IA Ativa">
                       <Bot size={10} />
                     </div>
                   )}
                </div>
              </div>
              
              <div className="wa-item-content">
                <div className="wa-item-header">
                  <span className="wa-item-name">{lead.name}</span>
                  <span className="wa-item-time">
                    {formatChatTime(lead.messages && lead.messages.length > 0 ? lead.messages[0].timestamp : lead.createdAt)}
                  </span>
                </div>
                <div className="wa-item-footer">
                  <p className="wa-item-last-msg">
                    {lead.messages && lead.messages.length > 0 
                      ? lead.messages[0].content 
                      : "Nenhuma mensagem ainda"}
                  </p>
                  <div className="wa-item-actions">
                    <button 
                      className="wa-delete-btn"
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
