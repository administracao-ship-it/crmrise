"use client";

import { useState } from "react";
import ChatList from "./ChatList";
import ChatDetails from "./ChatDetails";
import ChatPanel from "./ChatPanel";
import type { Lead, Stage } from "@/lib/api";

interface ChatModuleProps {
  stages: Stage[];
  selectedLead?: Lead | null;
  onSelectLead?: (lead: Lead | null) => void;
}

export default function ChatModule({ stages, selectedLead: externalLead, onSelectLead: externalOnSelect }: ChatModuleProps) {
  const [internalSelectedLead, setInternalSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLead = externalLead !== undefined ? externalLead : internalSelectedLead;
  const setSelectedLead = externalOnSelect !== undefined ? externalOnSelect : setInternalSelectedLead;

  const allLeads = stages.flatMap(s => s.leads);
  
  // Sorting logical: Leads with more recent messages context first
  const sortedLeads = [...allLeads].sort((a, b) => {
    const timeA = a.messages && a.messages.length > 0 
      ? new Date(a.messages[0].timestamp).getTime() 
      : new Date(a.createdAt).getTime();
    const timeB = b.messages && b.messages.length > 0 
      ? new Date(b.messages[0].timestamp).getTime() 
      : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const filteredLeads = sortedLeads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery)
  );

  return (
    <div className="chat-module-wrapper">
      <div className="chat-module-columns">
        {/* Coluna 1: Lista de Contatos */}
        <div className="chat-col chat-col-list">
          <ChatList 
            leads={filteredLeads}
            selectedLeadId={selectedLead?.id}
            onSelectLead={setSelectedLead}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Coluna 2: Conversa Ativa */}
        <div className="chat-col chat-col-view">
          {selectedLead ? (
            <ChatPanel 
              lead={selectedLead} 
              isFullScreen={true}
              onClose={() => setSelectedLead(null)} 
            />
          ) : (
            <div className="chat-view-empty">
              <div className="chat-empty-illustration">💬</div>
              <h2>Suas Conversas</h2>
              <p>Selecione um lead na lista ao lado para iniciar o atendimento.</p>
            </div>
          )}
        </div>

        {/* Coluna 3: Detalhes do Lead */}
        <div className="chat-col chat-col-details">
          <ChatDetails lead={selectedLead} stages={stages} />
        </div>
      </div>
    </div>
  );
}
