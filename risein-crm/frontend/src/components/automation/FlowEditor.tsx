'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
    Save, Plus, Play, Trash2, Settings, MessageSquare, Clock, Zap, 
    Target, Tag as TagIcon, Layout, MoreHorizontal, ChevronDown, 
    Heart, MessageCircle, Mail, Phone, Info, StopCircle, Code, 
    MousePointer2, UserPlus, HelpCircle, X
} from 'lucide-react';
import { TriggerNode, MessageNode, DelayNode, ActionNode, StopNode, ConditionNode } from './CustomNodes';

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  action: ActionNode,
  stop: StopNode,
  condition: ConditionNode,
};

const initialEdges: any[] = [];

export default function FlowEditor({ automation, stages = [], tags = [], onSave }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // New state for interactive building
  const [pendingAdd, setPendingAdd] = useState<{ nodeId: string, handleId: string } | null>(null);

  const handleAddStepFromNode = useCallback((nodeId: string, handleId: string) => {
      setPendingAdd({ nodeId, handleId });
      setIsMenuOpen(true);
  }, []);

  const updateNodeData = useCallback((data: any) => {
    setSelectedNode((current: any) => {
        if (!current) return null;
        
        let newLabel = data.label || current.data.label;
        
        if (current.type === 'trigger') {
            if (data.triggerType === 'NEW_LEAD') newLabel = 'Start bot';
            if (data.triggerType === 'STAGE_CHANGE' || (current.data.triggerType === 'STAGE_CHANGE' && data.triggerId)) {
                const stageId = data.triggerId || current.data.triggerId;
                const stage = stages.find((s: any) => s.id === stageId || String(s.id) === String(stageId));
                newLabel = `Etapa: ${stage?.name || '---'}`;
            }
        }

        const updatedData = { ...current.data, ...data, label: newLabel };

        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === current.id) {
              return { ...node, data: updatedData };
            }
            return node;
          })
        );
        return { ...current, data: updatedData };
    });
  }, [stages, setNodes]);

  const deleteNode = useCallback((nodeId?: string) => {
      const idToDelete = nodeId || (selectedNode?.id);
      if (!idToDelete) return;
      
      setNodes((nds) => nds.filter((n) => n.id !== idToDelete));
      setEdges((eds) => eds.filter((e) => e.source !== idToDelete && e.target !== idToDelete));
      if (selectedNode?.id === idToDelete) setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const onAddNode = useCallback((type: string) => {
    const id = `${Date.now()}`;
    const newNode = {
      id,
      type,
      data: { 
          label: type === 'message' ? 'Enviar WhatsApp' : type === 'delay' ? 'Aguardar' : type === 'trigger' ? 'Start bot' : 'Nova Ação',
          content: '',
          delay: 1,
          unit: 'minutes',
          triggerType: type === 'trigger' ? 'NEW_LEAD' : undefined,
          action: type === 'action' ? 'ADD_TAG' : undefined,
          onAddStep: handleAddStepFromNode,
          onDelete: deleteNode
      },
      position: { x: 500, y: 300 },
    };

    if (pendingAdd) {
        setNodes((nds) => {
            const sourceNode = nds.find(n => n.id === pendingAdd.nodeId);
            if (sourceNode) {
                newNode.position = {
                    x: sourceNode.position.x + 400,
                    y: sourceNode.position.y + (pendingAdd.handleId === 'fail' || pendingAdd.handleId === 'no' ? 250 : 0)
                };
            }
            return nds.concat(newNode);
        });

        const newEdge = {
            id: `e-${pendingAdd.nodeId}-${id}`,
            source: pendingAdd.nodeId,
            target: id,
            sourceHandle: pendingAdd.handleId,
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
        };
        setEdges((eds) => eds.concat(newEdge));
    } else {
        setNodes((nds) => nds.concat(newNode));
    }

    setSelectedNode(newNode);
    setIsMenuOpen(false);
    setPendingAdd(null);
  }, [pendingAdd, handleAddStepFromNode, deleteNode, setNodes, setEdges]);

  // Wrap nodes with the callback
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onAddStep: handleAddStepFromNode,
        onDelete: deleteNode,
      },
    }));
  }, [nodes, handleAddStepFromNode, deleteNode]);

  useEffect(() => {
    if (automation) {
        if (automation.nodes && automation.nodes !== '[]') {
            const parsedNodes = JSON.parse(automation.nodes).map((n: any) => ({
                ...n,
                data: { ...n.data, onAddStep: handleAddStepFromNode, onDelete: deleteNode }
            }));
            setNodes(parsedNodes);
        } else if (nodes.length === 0) {
            setNodes([{
                id: '1',
                type: 'trigger',
                data: { label: 'Start bot', triggerType: 'NEW_LEAD', onAddStep: handleAddStepFromNode, onDelete: deleteNode } as any,
                position: { x: 350, y: 100 },
            }]);
        }
        
        if (automation.edges && automation.edges !== '[]') {
            setEdges(JSON.parse(automation.edges).map((e: any) => ({
                ...e,
                animated: true,
                style: { stroke: '#94a3b8', strokeWidth: 3 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
            })));
        }
    }
  }, [automation, setNodes, setEdges, handleAddStepFromNode, deleteNode]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({
        ...params,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    }, eds)),
    [setEdges]
  );

  const onSaveClick = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      onSave(flow);
    }
  };

  const onNodeClick = (_: any, node: any) => {
    setSelectedNode(node);
  };

  const renderSidebarContent = () => {
      if (!selectedNode) return (
        <div className="text-center py-20 opacity-30">
          <MousePointer2 size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Selecione um bloco</p>
        </div>
      );

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {selectedNode.type === 'trigger' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Evento Ativador</label>
                        <select 
                            className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                            value={selectedNode.data.triggerType || 'NEW_LEAD'}
                            onChange={(e) => updateNodeData({ triggerType: e.target.value })}
                        >
                            <option value="NEW_LEAD">Novo Lead Criado</option>
                            <option value="STAGE_CHANGE">Mudança de Etapa</option>
                        </select>
                    </div>

                    {selectedNode.data.triggerType === 'STAGE_CHANGE' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                <Zap size={12} className="mr-1 text-emerald-500" /> Gatilha ao entrar em:
                            </label>
                            <select 
                                className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                                value={selectedNode.data.triggerId || ''}
                                onChange={(e) => updateNodeData({ triggerId: e.target.value })}
                            >
                                <option value="">Qualquer Etapa</option>
                                {stages.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {selectedNode.type === 'message' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conteúdo da Mensagem</label>
                        <textarea
                            className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner h-48 resize-none"
                            placeholder="Olá [Contact: Full name]..."
                            value={selectedNode.data.content || ''}
                            onChange={(e) => updateNodeData({ content: e.target.value })}
                        />
                    </div>
                </div>
            )}

            {selectedNode.type === 'action' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                            <Target size={14} className="mr-1 text-indigo-600" /> 
                            TIPO DE AÇÃO
                        </label>
                        <select 
                            className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                            value={selectedNode.data.action || 'ADD_TAG'}
                            onChange={(e) => updateNodeData({ action: e.target.value })}
                        >
                            <option value="ADD_TAG">Adicionar Tag</option>
                            <option value="UPDATE_FIELD">Atualizar Campo</option>
                        </select>
                    </div>

                    {selectedNode.data.action === 'ADD_TAG' && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                <TagIcon size={14} className="mr-1 text-indigo-600" /> 
                                Selecionar Tag
                            </label>
                            <select 
                                className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                value={selectedNode.data.tagId || ''}
                                onChange={(e) => updateNodeData({ tagId: e.target.value })}
                            >
                                <option value="">Selecione uma tag</option>
                                {tags.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            <button 
                onClick={() => deleteNode()}
                className="w-full py-4 mt-8 flex items-center justify-center space-x-2 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border-2 border-transparent hover:border-red-600 shadow-sm"
            >
                <Trash2 size={14} />
                <span>Remover Bloco Permanentemente</span>
            </button>
        </div>
      );
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-slate-100 flex overflow-hidden font-inter">
      {/* SaaS Sidebar for Node properties */}
      <div className="w-90 bg-white border-r flex flex-col z-10 shadow-2xl relative">
        <div className="p-8 border-b flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="bg-slate-900 p-2 rounded-xl text-white">
                    <Settings size={18} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Configuração</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ajuste os parâmetros</p>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            {renderSidebarContent()}
        </div>
      </div>

      {/* Main Flow Editor Area */}
      <div className="flex-1 relative bg-white">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          onNodeClick={onNodeClick}
          fitView
          className="bg-slate-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          
          {/* Triggers Panel Card (matching reference) */}
          <Panel position="top-left" className="m-8">
             <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 w-64 ring-1 ring-slate-900/5">
                <h4 className="text-sm font-black text-slate-800 tracking-tight mb-2">Triggers</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6">
                    Launch bots automatically based on the rules you set or manually from the lead card.
                </p>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-6">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Created in pipeline stage</span>
                </div>
                <button 
                   onClick={() => onAddNode('trigger')}
                   className="w-full py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 hover:border-slate-200 transition-all flex items-center justify-center space-x-2"
                >
                    <Plus size={14} />
                    <span>Trigger</span>
                </button>
             </div>
          </Panel>

          {/* Add Next Step Menu (matching reference) */}
          <Panel position="bottom-right" className="m-8">
              <div className="relative">
                  <div className={`flex flex-col items-end space-y-4 transition-all duration-300 ${isMenuOpen ? 'mb-4' : ''}`}>
                      {isMenuOpen && (
                        <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 w-72 overflow-hidden py-2 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1 flex justify-between items-center">
                                <span>Add next step</span>
                                <button onClick={() => { setIsMenuOpen(false); setPendingAdd(null); }} className="text-slate-300 hover:text-slate-600"><X size={14} /></button>
                            </div>
                            
                            <button onClick={() => onAddNode('message')} className="w-full px-5 py-4 text-left hover:bg-blue-50 transition-all flex items-center space-x-4 group border-l-4 border-transparent hover:border-blue-500">
                                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 group-hover:scale-110 transition-transform"><MessageSquare size={18} /></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">WhatsApp Message</span>
                                    <span className="text-[9px] text-slate-400 font-bold">Enviar texto ou mídia</span>
                                </div>
                            </button>
                            
                            <button onClick={() => onAddNode('action')} className="w-full px-5 py-4 text-left hover:bg-indigo-50 transition-all flex items-center space-x-4 group border-l-4 border-transparent hover:border-indigo-500">
                                <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform"><Target size={18} /></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">CRM Action</span>
                                    <span className="text-[9px] text-slate-400 font-bold">Tags ou campos do lead</span>
                                </div>
                            </button>

                            <button onClick={() => onAddNode('condition')} className="w-full px-5 py-4 text-left hover:bg-purple-50 transition-all flex items-center space-x-4 group border-l-4 border-transparent hover:border-purple-500">
                                <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600 group-hover:scale-110 transition-transform"><Info size={18} /></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Condition</span>
                                    <span className="text-[9px] text-slate-400 font-bold">Divisão por filtros (Se/Senão)</span>
                                </div>
                            </button>

                            <button onClick={() => onAddNode('delay')} className="w-full px-5 py-4 text-left hover:bg-amber-50 transition-all flex items-center space-x-4 group border-l-4 border-transparent hover:border-amber-500">
                                <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 group-hover:scale-110 transition-transform"><Clock size={18} /></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Pause</span>
                                    <span className="text-[9px] text-slate-400 font-bold">Aguardar tempo específico</span>
                                </div>
                            </button>

                            <button onClick={() => onAddNode('stop')} className="w-full px-5 py-4 text-left hover:bg-red-50 transition-all flex items-center space-x-4 group border-l-4 border-transparent hover:border-red-500">
                                <div className="bg-red-100 p-2.5 rounded-xl text-red-600 group-hover:scale-110 transition-transform"><StopCircle size={18} /></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Stop Bot</span>
                                    <span className="text-[9px] text-slate-400 font-bold">Encerrar o fluxo aqui</span>
                                </div>
                            </button>
                        </div>
                      )}
                      
                      {!isMenuOpen && (
                          <button 
                            onClick={() => setIsMenuOpen(true)}
                            className="flex items-center space-x-3 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest active:scale-95 ring-8 ring-slate-900/10"
                          >
                              <Plus size={20} strokeWidth={3} />
                              <span>Add step</span>
                          </button>
                      )}
                  </div>
              </div>
          </Panel>

          <Panel position="top-right" className="m-8">
            <button
                onClick={onSaveClick}
                className="flex items-center space-x-3 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl hover:bg-emerald-600 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
            >
                <Save size={18} />
                <span>Salvar Fluxo</span>
            </button>
          </Panel>

          <Controls className="!bg-white !rounded-3xl !shadow-2xl !border-slate-100 !p-1 !m-8" />
        </ReactFlow>
      </div>
    </div>
  );
}
