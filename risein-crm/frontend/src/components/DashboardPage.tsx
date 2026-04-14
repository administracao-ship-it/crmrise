"use client";

import React, { useMemo } from "react";
import { 
  Users, TrendingUp, DollarSign, Target, 
  BarChart3, Activity, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import type { Stage, Lead } from "@/lib/api";

interface DashboardPageProps {
  stages: Stage[];
}

export default function DashboardPage({ stages }: DashboardPageProps) {
  const metrics = useMemo(() => {
    const allLeads = stages.flatMap(s => s.leads);
    const totalLeads = allLeads.length;
    
    // Filter terminal stages by name (as requested)
    const soldLeads = allLeads.filter(l => l.stage?.name.toLowerCase().includes("vendid"));
    const totalSoldValue = soldLeads.reduce((acc, l) => acc + (l.value || 0), 0);
    
    const activeLeads = allLeads.filter(l => 
        !l.stage?.name.toLowerCase().includes("vendid") && 
        !l.stage?.name.toLowerCase().includes("perdid") &&
        !l.stage?.name.toLowerCase().includes("não lead")
    );
    const activeValue = activeLeads.reduce((acc, l) => acc + (l.value || 0), 0);
    
    const conversionRate = totalLeads > 0 ? (soldLeads.length / totalLeads) * 100 : 0;

    // Data for stage breakdown chart
    const stageData = stages.map(s => ({
      name: s.name,
      count: s.leads.length,
      value: s.leads.reduce((acc, l) => acc + (l.value || 0), 0)
    })).sort((a,b) => b.count - a.count);

    return {
      totalLeads,
      totalSoldValue,
      activeLeads: activeLeads.length,
      activeValue,
      conversionRate,
      stageData
    };
  }, [stages]);

  const maxCount = Math.max(...metrics.stageData.map(d => d.count), 1);

  return (
    <div className="dashboard-container p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Visão Geral do Funil</h1>
          <p className="text-gray-400">Análise de performance e saúde das vendas em tempo real</p>
        </div>
        <div className="flex gap-3">
          <div className="badge-glass px-4 py-2 flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            <span className="text-white font-medium">Sistema Ativo</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="metric-card-premium glass-panel p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400">
              <Users size={22} />
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full flex items-center gap-1">
              <ArrowUpRight size={12} /> +12%
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Total de Leads</p>
          <h2 className="text-3xl font-bold text-white">{metrics.totalLeads}</h2>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users size={120} />
          </div>
        </div>

        <div className="metric-card-premium glass-panel p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-green-500/10 p-2.5 rounded-xl text-green-400">
              <TrendingUp size={22} />
            </div>
            <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              META 85%
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Taxa de Conversão</p>
          <h2 className="text-3xl font-bold text-white">{metrics.conversionRate.toFixed(1)}%</h2>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
        </div>

        <div className="metric-card-premium glass-panel p-5 relative overflow-hidden group border-glow-blue">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400">
              <DollarSign size={22} />
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Total Vendido</p>
          <h2 className="text-3xl font-bold text-white">
            R$ {metrics.totalSoldValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={120} />
          </div>
        </div>

        <div className="metric-card-premium glass-panel p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400">
              <Target size={22} />
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Valor em Negociação</p>
          <h2 className="text-3xl font-bold text-white">
            R$ {metrics.activeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Target size={120} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Funnel Distribution Chart */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-400" />
              Distribuição por Etapa
            </h3>
          </div>
          
          <div className="space-y-6">
            {metrics.stageData.map((stage) => {
              const width = (stage.count / maxCount) * 100;
              return (
                <div key={stage.name} className="group cursor-default">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300 font-medium group-hover:text-white transition-colors">
                      {stage.name}
                    </span>
                    <span className="text-gray-400 font-mono">
                      {stage.count} leads • <span className="text-emerald-400">R$ {stage.value.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${Math.max(width, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insight Column */}
        <div className="glass-panel p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Foco de Ação</h3>
          
          <div className="space-y-4 flex-1">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">Prioridade Alta</p>
              <p className="text-gray-200 text-sm leading-relaxed">
                Você tem <strong>{metrics.activeLeads}</strong> leads ativos que precisam de atenção.
                O valor total sob sua gestão é de R$ {metrics.activeValue.toLocaleString()}.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Performance</p>
              <p className="text-gray-200 text-sm leading-relaxed">
                Sua taxa de conversão atual é de <strong>{metrics.conversionRate.toFixed(1)}%</strong>. 
                Continue movendo leads para a etapa de negociação final.
              </p>
            </div>
          </div>

          <button className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-550 text-white rounded-xl font-semibold shadow-glow transition-all active:scale-95">
            Gerar Relatório Completo
          </button>
        </div>
      </div>
    </div>
  );
}
