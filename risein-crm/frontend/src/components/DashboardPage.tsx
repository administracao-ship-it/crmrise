"use client";

import React, { useMemo } from "react";
import { 
  Users, TrendingUp, DollarSign, Target, 
  BarChart3, Zap, ArrowUpRight, Activity,
  CheckCircle2, AlertCircle, CircleDot
} from "lucide-react";
import type { Stage } from "@/lib/api";

interface DashboardPageProps {
  stages: Stage[];
}

export default function DashboardPage({ stages }: DashboardPageProps) {
  const metrics = useMemo(() => {
    const allLeads = stages.flatMap(s => s.leads);
    const totalLeads = allLeads.length;
    
    const soldLeads = allLeads.filter(l => l.stage?.name.toLowerCase().includes("vendid"));
    const totalSoldValue = soldLeads.reduce((acc, l) => acc + (l.value || 0), 0);
    
    const activeLeads = allLeads.filter(l => 
        !l.stage?.name.toLowerCase().includes("vendid") && 
        !l.stage?.name.toLowerCase().includes("perdid") &&
        !l.stage?.name.toLowerCase().includes("não lead")
    );
    const activeValue = activeLeads.reduce((acc, l) => acc + (l.value || 0), 0);
    const conversionRate = totalLeads > 0 ? (soldLeads.length / totalLeads) * 100 : 0;

    const stageData = stages.map(s => ({
      name: s.name,
      count: s.leads.length,
      value: s.leads.reduce((acc, l) => acc + (l.value || 0), 0),
      isTerminal: s.name.toLowerCase().includes("vendid") || 
                  s.name.toLowerCase().includes("perdid") ||
                  s.name.toLowerCase().includes("não lead")
    })).sort((a, b) => b.count - a.count);

    return { totalLeads, totalSoldValue, activeLeads: activeLeads.length, activeValue, conversionRate, stageData };
  }, [stages]);

  const maxCount = Math.max(...metrics.stageData.map(d => d.count), 1);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

  return (
    <div className="db-root">
      {/* Header */}
      <div className="db-header">
        <div>
          <h1 className="db-title">Visão Geral</h1>
          <p className="db-subtitle">Saúde do seu pipeline em tempo real</p>
        </div>
        <div className="db-status-pill">
          <span className="db-status-dot" />
          Sistema Ativo
        </div>
      </div>

      {/* KPI Cards */}
      <div className="db-kpi-grid">
        <div className="db-kpi-card db-kpi-blue">
          <div className="db-kpi-icon-wrap" style={{ background: "rgba(0,102,255,0.12)" }}>
            <Users size={20} color="#4c96ff" />
          </div>
          <div className="db-kpi-body">
            <span className="db-kpi-label">Total de Leads</span>
            <span className="db-kpi-value">{metrics.totalLeads}</span>
          </div>
          <div className="db-kpi-badge db-badge-blue">
            <ArrowUpRight size={11} /> +12%
          </div>
        </div>

        <div className="db-kpi-card db-kpi-green">
          <div className="db-kpi-icon-wrap" style={{ background: "rgba(16,185,129,0.12)" }}>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div className="db-kpi-body">
            <span className="db-kpi-label">Taxa de Conversão</span>
            <span className="db-kpi-value">{metrics.conversionRate.toFixed(1)}%</span>
          </div>
          <div className="db-kpi-badge db-badge-green">
            META 85%
          </div>
        </div>

        <div className="db-kpi-card db-kpi-emerald">
          <div className="db-kpi-icon-wrap" style={{ background: "rgba(52,211,153,0.12)" }}>
            <DollarSign size={20} color="#34d399" />
          </div>
          <div className="db-kpi-body">
            <span className="db-kpi-label">Total Vendido</span>
            <span className="db-kpi-value db-kpi-value-sm">{formatCurrency(metrics.totalSoldValue)}</span>
          </div>
          <CheckCircle2 size={18} color="#34d399" opacity={0.6} />
        </div>

        <div className="db-kpi-card db-kpi-amber">
          <div className="db-kpi-icon-wrap" style={{ background: "rgba(245,158,11,0.12)" }}>
            <Target size={20} color="#f59e0b" />
          </div>
          <div className="db-kpi-body">
            <span className="db-kpi-label">Em Negociação</span>
            <span className="db-kpi-value db-kpi-value-sm">{formatCurrency(metrics.activeValue)}</span>
          </div>
          <div className="db-kpi-badge db-badge-amber">
            {metrics.activeLeads} ativo{metrics.activeLeads !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="db-body-grid">
        {/* Stage Funnel */}
        <div className="db-card db-card-lg">
          <div className="db-card-header">
            <div className="db-card-title-wrap">
              <BarChart3 size={18} color="var(--accent-blue-light)" />
              <h3 className="db-card-title">Distribuição por Etapa</h3>
            </div>
            <span className="db-card-subtitle">{metrics.stageData.length} etapas</span>
          </div>
          <div className="db-funnel-list">
            {metrics.stageData.map((stage, idx) => {
              const width = (stage.count / maxCount) * 100;
              const isTerminal = stage.isTerminal;
              return (
                <div key={stage.name} className="db-funnel-row">
                  <div className="db-funnel-meta">
                    <div className="db-funnel-name-wrap">
                      <span className="db-funnel-rank">{String(idx + 1).padStart(2, "0")}</span>
                      <span className="db-funnel-name">{stage.name}</span>
                      {isTerminal && <span className="db-terminal-badge">Arquivo</span>}
                    </div>
                    <div className="db-funnel-stats">
                      <span className="db-funnel-count">{stage.count} leads</span>
                      {stage.value > 0 && (
                        <span className="db-funnel-value">{formatCurrency(stage.value)}</span>
                      )}
                    </div>
                  </div>
                  <div className="db-bar-track">
                    <div 
                      className={`db-bar-fill ${isTerminal ? "db-bar-terminal" : "db-bar-active"}`}
                      style={{ width: `${Math.max(width, stage.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {metrics.stageData.length === 0 && (
              <div className="db-empty-state">
                <BarChart3 size={32} opacity={0.2} />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Insight Panel */}
        <div className="db-card db-card-sm">
          <div className="db-card-header">
            <div className="db-card-title-wrap">
              <Zap size={18} color="#f59e0b" />
              <h3 className="db-card-title">Foco de Ação</h3>
            </div>
          </div>

          <div className="db-insights">
            <div className="db-insight-item db-insight-orange">
              <div className="db-insight-icon-row">
                <AlertCircle size={16} color="#f97316" />
                <span className="db-insight-tag db-insight-tag-orange">Prioridade Alta</span>
              </div>
              <p className="db-insight-text">
                <strong>{metrics.activeLeads}</strong> lead{metrics.activeLeads !== 1 ? "s" : ""} ativo{metrics.activeLeads !== 1 ? "s" : ""} sob sua gestão, com um total de{" "}
                <strong>{formatCurrency(metrics.activeValue)}</strong> em negociação.
              </p>
            </div>

            <div className="db-insight-item db-insight-blue">
              <div className="db-insight-icon-row">
                <Activity size={16} color="#4c96ff" />
                <span className="db-insight-tag db-insight-tag-blue">Performance</span>
              </div>
              <p className="db-insight-text">
                Conversão atual em{" "}
                <strong>{metrics.conversionRate.toFixed(1)}%</strong>. Continue movendo leads para o fechamento.
              </p>
            </div>

            <div className="db-insight-item db-insight-green">
              <div className="db-insight-icon-row">
                <CircleDot size={16} color="#10b981" />
                <span className="db-insight-tag db-insight-tag-green">Vendas</span>
              </div>
              <p className="db-insight-text">
                Receita fechada:{" "}
                <strong style={{ color: "#34d399" }}>{formatCurrency(metrics.totalSoldValue)}</strong>
              </p>
            </div>
          </div>

          <button className="db-report-btn">
            Gerar Relatório Completo
          </button>
        </div>
      </div>
    </div>
  );
}
