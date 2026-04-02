'use client';

import React, { useState, useEffect } from 'react';
import FlowEditor from '../../components/automation/FlowEditor';
import { ArrowLeft, Play, Pause, Trash2, Settings, Layers, Zap, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { ReactFlowProvider } from 'reactflow';

export default function AutomationPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchAutomations();
    fetchStages();
    fetchTags();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/automation`);
      const data = await res.json();
      setAutomations(data);
      if (data.length > 0 && !selectedAutomation) {
        setSelectedAutomation(data[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch automations', err);
      setLoading(false);
    }
  };

  const fetchStages = async () => {
      try {
          const res = await fetch(`${API_URL}/api/stages`);
          const data = await res.json();
          setStages(data);
      } catch (err) {
          console.error('Failed to fetch stages', err);
      }
  };

  const fetchTags = async () => {
      try {
          const res = await fetch(`${API_URL}/api/tags`);
          const data = await res.json();
          setTags(data);
      } catch (err) {
          console.error('Failed to fetch tags', err);
      }
  };

  const handleSave = async (flow: any) => {
    if (!selectedAutomation) return;

    try {
      const res = await fetch(`${API_URL}/api/automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedAutomation,
          nodes: JSON.stringify(flow.nodes),
          edges: JSON.stringify(flow.edges),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAutomations(automations.map(a => a.id === updated.id ? updated : a));
        setSelectedAutomation(updated);
        alert('Automação salva com sucesso!');
      }
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const createNewAutomation = async () => {
    const name = prompt('Nome da Automação:');
    if (!name) return;

    try {
      const res = await fetch(`${API_URL}/api/automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          triggerType: 'STAGE_CHANGE',
          nodes: JSON.stringify([{ id: '1', type: 'trigger', data: { label: 'Novo Lead' }, position: { x: 100, y: 100 } }]),
          edges: '[]',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAutomations([...automations, data]);
        setSelectedAutomation(data);
      }
    } catch (err) {
      console.error('Creation failed', err);
    }
  };

  const toggleActive = async (id: string) => {
      try {
          const res = await fetch(`${API_URL}/api/automation/${id}/toggle`, { method: 'PATCH' });
          if (res.ok) {
              const updated = await res.json();
              setAutomations(automations.map(a => a.id === updated.id ? updated : a));
              if (selectedAutomation?.id === updated.id) {
                  setSelectedAutomation(updated);
              }
          }
      } catch (err) {
          console.error('Toggle failed', err);
      }
  };

  const deleteAutomation = async (id: string) => {
      if (!confirm('Deseja excluir esta automação permanentemente?')) return;
      try {
          const res = await fetch(`${API_URL}/api/automation/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setAutomations(automations.filter(a => a.id !== id));
              if (selectedAutomation?.id === id) setSelectedAutomation(null);
          }
      } catch (err) {
          console.error('Delete failed', err);
      }
  };

  const updateTriggerId = async (triggerId: string) => {
      if (!selectedAutomation) return;
      try {
          const updatedData = { ...selectedAutomation, triggerId };
          const res = await fetch(`${API_URL}/api/automation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedData),
          });
          if (res.ok) {
              const data = await res.json();
              setAutomations(automations.map(a => a.id === data.id ? data : a));
              setSelectedAutomation(data);
          }
      } catch (err) {
          console.error('Trigger update failed', err);
      }
  };

  if (loading) return <div className="p-10">Carregando automações...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-inter">
      {/* Top Header */}
      <header className="h-16 bg-white border-b px-6 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
                <Layers size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Rise In <span className="text-blue-600">FLOW</span></h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedAutomation && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
               <span className="px-3 text-xs font-bold text-slate-500 uppercase">Status:</span>
               <button 
                onClick={() => toggleActive(selectedAutomation.id)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    selectedAutomation.isActive 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-slate-300 text-slate-600 hover:bg-slate-400'
                }`}
               >
                 {selectedAutomation.isActive ? <Play size={14} fill="white" /> : <Pause size={14} fill="currentColor" />}
                 <span>{selectedAutomation.isActive ? 'ATIVO' : 'DESATIVADO'}</span>
               </button>
            </div>
          )}
          <button 
            onClick={createNewAutomation}
            className="flex items-center space-x-2 bg-slate-900 border border-slate-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>NOVO FLUXO</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Automation List */}
        <aside className="w-80 bg-white border-r flex flex-col z-10 shadow-sm">
          <div className="p-4 border-b bg-slate-50">
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Pesquisar automações..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                />
                <div className="absolute left-3 top-2.5 text-slate-400"><Layers size={14} /></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {automations.map((a) => (
              <div 
                key={a.id}
                onClick={() => setSelectedAutomation(a)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border-2 relative group overflow-hidden ${
                  selectedAutomation?.id === a.id 
                  ? 'bg-blue-50 border-blue-500 shadow-md ring-4 ring-blue-50/50' 
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {a.isActive && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-bl-lg animate-pulse" />}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 line-clamp-1">{a.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center">
                        <Zap size={10} className="mr-1 text-blue-500" /> {a.triggerType}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteAutomation(a.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {automations.length === 0 && (
                <div className="text-center py-10">
                    <div className="mb-4 flex justify-center opacity-20"><Zap size={48} /></div>
                    <p className="text-sm font-bold text-slate-400">Nenhuma automação criada ainda.</p>
                </div>
            )}
          </div>

        </aside>

        {/* Main Editor */}
        <main className="flex-1 bg-slate-100">
          <ReactFlowProvider>
            {selectedAutomation ? (
              <FlowEditor 
                automation={selectedAutomation} 
                stages={stages}
                tags={tags}
                onSave={handleSave} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 flex-col">
                 <div className="p-8 bg-white rounded-full shadow-2xl mb-6 shadow-slate-200 ring-8 ring-white/50">
                    <Zap size={64} className="text-blue-600 animate-pulse" />
                 </div>
                 <h2 className="text-xl font-black text-slate-700 uppercase tracking-tighter">Seleção de Fluxo</h2>
                 <p className="text-sm font-medium mt-2 max-w-xs text-center">Inicie uma nova jornada de automação clicando em "+ NOVO FLUXO" ou selecione ao lado.</p>
              </div>
            )}
          </ReactFlowProvider>
        </main>
      </div>
    </div>
  );
}
