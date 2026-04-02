"use client";

import { useState } from "react";
import ChatList from "./ChatList";
import ChatDetails from "./ChatDetails";
import ChatPanel from "./ChatPanel";
import type { Lead, Stage } from "@/lib/api";

interface ChatModuleProps {
  stages: Stage[];
}

export default function ChatModule({ stages }: ChatModuleProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allLeads = stages.flatMap(s => s.leads);
  const filteredLeads = allLeads.filter(l => 
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
