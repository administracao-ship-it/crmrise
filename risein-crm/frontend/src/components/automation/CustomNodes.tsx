import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Clock, Zap, Target, ArrowRight, Play, Square, Info, MoreHorizontal, Paperclip, ChevronRight, Plus, Trash2 } from 'lucide-react';

// Common Shell for Nodes (SaaS Style)
const NodeShell = ({ children, headerColor = 'bg-slate-100', borderColor = 'border-slate-200', title, icon: Icon, stats, selected, onDelete, id }: any) => (
  <div className={`shadow-2xl rounded-2xl bg-white border-2 ${selected ? 'border-blue-500 ring-8 ring-blue-500/10 scale-105' : borderColor} min-w-[300px] overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)]`}>
    <div className={`${headerColor} px-4 py-3 border-b-2 ${selected ? 'border-blue-500/20' : borderColor} flex items-center justify-between`}>
      <div className="flex items-center space-x-2.5">
        <div className={`p-1.5 rounded-lg ${selected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {Icon && <Icon size={14} />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{title}</span>
      </div>
      <div className="flex items-center space-x-1">
          {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Excluir este bloco"
              >
                  <Trash2 size={14} />
              </button>
          )}
          <MoreHorizontal size={14} className="text-slate-300 cursor-pointer hover:text-slate-600 transition-colors" />
      </div>
    </div>
    
    {stats && (
        <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex justify-between">
            {Object.entries(stats).map(([label, value]: any) => (
                <div key={label} className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}:</span>
                    <span className="text-[10px] font-black text-slate-700">{value}</span>
                </div>
            ))}
        </div>
    )}
    
    <div className="p-4">
      {children}
    </div>
  </div>
);

const AddStepButton = ({ onClick, className = "" }: any) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-7 h-7 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center text-white hover:scale-125 hover:rotate-90 active:scale-95 transition-all shadow-xl z-50 ${className}`}
    >
        <Plus size={14} strokeWidth={4} />
    </button>
);

export const TriggerNode = memo(({ data, id, selected }: any) => {
  const isStage = data.triggerType === 'STAGE_CHANGE';
  
  return (
    <div className={`px-6 py-3.5 shadow-2xl rounded-full ${isStage ? 'bg-orange-500 border-orange-600 font-bold' : 'bg-emerald-500 border-emerald-600'} border-2 flex items-center space-x-3 text-white transition-all hover:scale-110 active:scale-95 group relative ${selected ? 'ring-8 ring-blue-500/10 border-blue-500 scale-110' : ''}`}>
      <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
          {isStage ? <Zap size={18} fill="white" /> : <Play size={18} fill="white" />}
      </div>
      <div>
          <div className="text-[8px] font-black uppercase tracking-widest opacity-70 leading-none mb-0.5"> TRIGGER: {isStage ? 'ETAPA CRM' : 'NOVO LEAD'}</div>
          <div className="text-xs font-black uppercase tracking-tight">{data.label || 'Start bot'}</div>
      </div>
      
      {/* Node Actions */}
      <button 
        onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
      >
          <Trash2 size={12} strokeWidth={3} />
      </button>

      <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center text-slate-800">
          <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-800 border-2 border-white !mr-0 hover:scale-150 transition-transform" />
          <AddStepButton onClick={() => data.onAddStep(id, 'source')} className="ml-1 opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  );
});

export const MessageNode = memo(({ data, id, selected }: any) => {
  return (
    <div className="relative group">
      <NodeShell 
        title="Enviar mensagem (WhatsApp)" 
        icon={MessageSquare}
        headerColor="bg-slate-50"
        borderColor="border-slate-100"
        stats={{ 'Launches': '77', 'Sent': '77', 'Read': '0' }}
        selected={selected}
        onDelete={data.onDelete}
        id={id}
      >
        <div className="relative">
            <div className="bg-blue-500 text-white p-5 rounded-2xl rounded-tr-none shadow-sm relative overflow-hidden group-hover:shadow-xl transition-all border border-blue-400/30">
                <div className="absolute top-0 right-0 p-2 opacity-20"><Paperclip size={14} /></div>
                <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">
                    {data.content || '👋 Digite sua mensagem aqui...\n\nUse [Contact: Full name] para personalizar.'}
                </p>
                <div className="flex gap-2 mt-5 flex-wrap">
                    <button className="px-3.5 py-1.5 rounded-full border border-white/30 bg-white/10 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm hover:bg-white/20 transition-all leading-none">+ Quick reply</button>
                    <button className="px-3.5 py-1.5 rounded-full border border-white/30 bg-white/10 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm hover:bg-white/20 transition-all leading-none">+ URL button</button>
                </div>
            </div>
            
            {/* Handle for "Failed to send" path */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-[8px] font-black text-red-500 uppercase mb-1.5 bg-red-50 px-2 py-0.5 rounded border border-red-100 shadow-sm">Failed to send</span>
                <div className="flex items-center">
                    <Handle type="source" id="fail" position={Position.Bottom} className="w-4 h-4 bg-red-400 border-2 border-white !relative !left-0 !transform-none hover:scale-125 transition-transform" />
                    <AddStepButton onClick={() => data.onAddStep(id, 'fail')} className="mt-1" />
                </div>
            </div>
        </div>
      </NodeShell>
      
      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-blue-500 border-2 border-white group-hover:scale-125 transition-transform" />
      
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center text-slate-800">
        <Handle type="source" id="success" position={Position.Right} className="w-4 h-4 bg-blue-500 border-2 border-white !mr-0 hover:scale-150 transition-transform" />
        <AddStepButton onClick={() => data.onAddStep(id, 'success')} className="ml-1 opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  );
});

export const ActionNode = memo(({ data, id, selected }: any) => {
    return (
      <div className="relative group">
        <div className={`px-6 py-4 shadow-2xl rounded-2xl bg-white border-2 ${selected ? 'border-indigo-600 ring-8 ring-indigo-500/10 scale-105' : 'border-indigo-500'} flex items-center justify-between min-w-[280px] hover:shadow-2xl transition-all`}>
            <div className="flex items-center space-x-4">
                <div className="rounded-xl p-2.5 bg-indigo-50 text-indigo-600 shadow-sm">
                    <Target size={22} />
                </div>
                <div>
                   <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1 shadow-sm inline-block px-1.5 py-0.5 bg-indigo-50 rounded">Processo</div>
                   <div className="text-xs font-black text-slate-800 uppercase tracking-tight">{data.label || 'Executar Ação'}</div>
                </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
        
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center text-slate-800">
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-800 border-2 border-white !mr-0 hover:scale-150 transition-transform" />
            <AddStepButton onClick={() => data.onAddStep(id, 'source')} className="ml-1 opacity-0 group-hover:opacity-100" />
        </div>
      </div>
    );
  });

export const DelayNode = memo(({ data, id, selected }: any) => {
  return (
    <div className={`px-5 py-4 shadow-2xl rounded-2xl bg-white border-2 ${selected ? 'border-amber-500 ring-8 ring-amber-500/10 scale-105' : 'border-amber-400'} min-w-[200px] group relative transition-all`}>
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-xl p-2.5 bg-amber-100 text-amber-600 shadow-inner">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1.5 inline-block px-1.5 py-0.5 bg-amber-50 rounded shadow-sm">Pausa</div>
              <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{data.delay || 0} {data.unit || 'minutos'}</div>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          >
              <Trash2 size={14} />
          </button>
      </div>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-amber-400 border-2 border-white" />
      
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center text-slate-800">
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-800 border-2 border-white !mr-0 hover:scale-150 transition-transform" />
        <AddStepButton onClick={() => data.onAddStep(id, 'source')} className="ml-1 opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  );
});

export const StopNode = memo(({ data, id, selected }: any) => {
    return (
      <div className={`px-6 py-4 shadow-2xl rounded-2xl bg-red-50 border-2 ${selected ? 'border-red-600 ring-8 ring-red-500/10 scale-105' : 'border-red-200'} flex items-center justify-between min-w-[180px] text-red-500 transition-all hover:bg-red-100 relative shadow-red-500/5 group`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-500 text-white rounded-lg shadow-lg">
             <Square size={16} fill="currentColor" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest leading-none">{data.label || 'Stop bot'}</span>
        </div>
        <button 
            onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
            className="p-1.5 text-red-200 hover:text-red-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
            <Trash2 size={14} />
        </button>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-400 border-2 border-white" />
      </div>
    );
  });

export const ConditionNode = memo(({ data, id, selected }: any) => {
    return (
      <div className="relative group">
        <NodeShell 
            title="Condição (Se / Senão)" 
            icon={Info}
            headerColor="bg-purple-50"
            borderColor="border-purple-200"
            selected={selected}
            onDelete={data.onDelete}
            id={id}
        >
            <div className="p-3 bg-purple-100/50 rounded-2xl border border-purple-200 text-center shadow-inner">
                <p className="text-[11px] font-black text-purple-700 uppercase tracking-wide">
                    {data.condition || 'Verificar qualificação...'}
                </p>
            </div>
            
            <div className="flex justify-between mt-8 relative">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase mb-2 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Sim</span>
                    <div className="relative flex items-center">
                        <Handle type="source" id="yes" position={Position.Right} className="w-4 h-4 bg-emerald-400 border-2 border-white !relative !right-0 !transform-none hover:scale-150 transition-transform shadow-md" />
                        <AddStepButton onClick={() => data.onAddStep(id, 'yes')} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-red-500 uppercase mb-2 bg-red-50 px-2 py-0.5 rounded border border-red-100">Não</span>
                    <div className="relative flex flex-col items-center">
                        <Handle type="source" id="no" position={Position.Bottom} className="w-4 h-4 bg-red-400 border-2 border-white !relative !bottom-0 !transform-none hover:scale-150 transition-transform shadow-md" />
                        <AddStepButton onClick={() => data.onAddStep(id, 'no')} className="mt-1 opacity-0 group-hover:opacity-100" />
                    </div>
                </div>
            </div>
        </NodeShell>
        <Handle type="target" position={Position.Left} className="w-4 h-4 bg-purple-500 border-2 border-white group-hover:scale-125 transition-transform" />
      </div>
    );
});
