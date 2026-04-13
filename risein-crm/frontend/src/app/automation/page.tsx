'use client';

import React, { useState, useEffect } from 'react';
import FlowEditor from '../../components/automation/FlowEditor';
import { ArrowLeft, Play, Pause, Trash2, Settings, Layers, Zap, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { ReactFlowProvider } from 'reactflow';
import toast from 'react-hot-toast';

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
        toast.success('Automação salva com sucesso!');
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

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Carregando automações...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <header style={{
        height: 64, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ padding: 8, borderRadius: '50%', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ height: 24, width: 1, background: 'var(--border-color)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'var(--accent-blue)', padding: 6, borderRadius: 8 }}>
                <Layers size={18} style={{ color: 'white' }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Rise In <span style={{ color: 'var(--accent-blue)' }}>FLOW</span></h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedAutomation && (
            <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
               <span style={{ padding: '0 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status:</span>
               <button 
                onClick={() => toggleActive(selectedAutomation.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700, transition: 'all 0.15s', border: 'none', cursor: 'pointer',
                  background: selectedAutomation.isActive ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                  color: selectedAutomation.isActive ? 'white' : 'var(--text-secondary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
               >
                 {selectedAutomation.isActive ? <Play size={14} fill="white" /> : <Pause size={14} fill="currentColor" />}
                 <span>{selectedAutomation.isActive ? 'ATIVO' : 'DESATIVADO'}</span>
               </button>
            </div>
          )}
          <button 
            onClick={createNewAutomation}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-blue)',
              color: 'white', padding: '8px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer', boxShadow: 'var(--premium-shadow)', transition: 'all 0.15s'
            }}
          >
            <Plus size={18} />
            <span>NOVO FLUXO</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - Automation List */}
        <aside style={{ width: 320, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <div style={{ position: 'relative' }}>
                <input 
                    type="text" 
                    placeholder="Pesquisar automações..." 
                    style={{
                      width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12,
                      fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', outline: 'none'
                    }}
                />
                <div style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}><Layers size={14} /></div>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {automations.map((a) => (
              <div 
                key={a.id}
                onClick={() => setSelectedAutomation(a)}
                style={{
                  padding: 16, borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s',
                  border: selectedAutomation?.id === a.id ? '2px solid var(--accent-blue)' : '2px solid var(--border-color)',
                  background: selectedAutomation?.id === a.id ? 'rgba(45, 106, 223, 0.08)' : 'var(--bg-card)',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: selectedAutomation?.id === a.id ? 'var(--premium-shadow)' : 'none'
                }}
              >
                {a.isActive && <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: 'var(--accent-green)', borderBottomLeftRadius: 8 }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</h4>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4, display: 'flex', alignItems: 'center' }}>
                        <Zap size={10} style={{ marginRight: 4, color: 'var(--accent-blue)' }} /> {a.triggerType}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteAutomation(a.id); }}
                    style={{
                      padding: 8, color: 'var(--text-muted)', background: 'transparent', border: 'none',
                      cursor: 'pointer', borderRadius: 8, transition: 'all 0.15s', opacity: 0.5
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent-red)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {automations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', opacity: 0.2 }}><Zap size={48} /></div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Nenhuma automação criada ainda.</p>
                </div>
            )}
          </div>

        </aside>

        {/* Main Editor */}
        <main style={{ flex: 1, background: 'var(--bg-primary)' }}>
          <ReactFlowProvider>
            {selectedAutomation ? (
              <FlowEditor 
                automation={selectedAutomation} 
                stages={stages}
                tags={tags}
                onSave={handleSave} 
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', flexDirection: 'column' }}>
                 <div style={{ padding: 32, background: 'var(--bg-secondary)', borderRadius: '50%', boxShadow: 'var(--premium-shadow)', marginBottom: 24, border: '1px solid var(--border-color)' }}>
                    <Zap size={64} style={{ color: 'var(--accent-blue)', animation: 'pulse 2s infinite' }} />
                 </div>
                 <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Seleção de Fluxo</h2>
                 <p style={{ fontSize: 13, fontWeight: 500, marginTop: 8, maxWidth: 280, textAlign: 'center', color: 'var(--text-secondary)' }}>Inicie uma nova jornada de automação clicando em "+ NOVO FLUXO" ou selecione ao lado.</p>
              </div>
            )}
          </ReactFlowProvider>
        </main>
      </div>
    </div>
  );
}

