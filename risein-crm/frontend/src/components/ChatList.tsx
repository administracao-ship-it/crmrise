"use client";

import { Search, CheckCircle2, Clock } from "lucide-react";
import type { Lead } from "@/lib/api";

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
                <div className="chat-avatar" style={{ width: '38px', height: '38px', fontSize: '14px' }}>
                   {lead.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="chat-item-info">
                <div className="chat-item-header">
                  <span className="chat-item-name">{lead.name}</span>
                  <span className="chat-item-time">10:42</span>
                </div>
                <div className="chat-item-footer">
                  <p className="chat-item-last-msg">
                    {lead.messages && lead.messages.length > 0 
                      ? lead.messages[0].content 
                      : "Nenhuma mensagem ainda"}
                  </p>
                  {/* Unread count or checkmark */}
                  <CheckCircle2 size={12} className="chat-status-icon" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
