"use client";

import { useState, useEffect } from "react";
import { 
    Users, 
    MessageSquare, 
    TrendingUp, 
    Clock, 
    Calendar,
    ChevronDown,
    BrainCircuit,
    UserCheck
} from "lucide-react";
import { fetchAiMetrics, AiMetrics } from "@/lib/api";
import toast from "react-hot-toast";

export default function AiMetricsPage() {
    const [metrics, setMetrics] = useState<AiMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30d");

    const loadMetrics = async (p: string) => {
        setLoading(true);
        try {
            const now = new Date();
            let start = new Date();
            
            if (p === "7d") start.setDate(now.getDate() - 7);
            else if (p === "30d") start.setDate(now.getDate() - 30);
            else if (p === "24h") start.setDate(now.getDate() - 1);

            const data = await fetchAiMetrics(start.toISOString(), now.toISOString());
            setMetrics(data);
        } catch (err) {
            toast.error("Erro ao carregar métricas da IA");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics(period);
    }, [period]);

    if (!metrics && loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Carregando análise...
            </div>
        );
    }

    return (
        <div className="metrics-container animate-fade-in">
            <header className="metrics-header">
                <div className="header-info">
                    <h1>Métricas de IA</h1>
                    <p>Monitore o desempenho e a conversão do atendimento automatizado</p>
                </div>
                
                <div className="period-selector">
                    <button 
                        className={period === "24h" ? "active" : ""} 
                        onClick={() => setPeriod("24h")}
                    >Hoje</button>
                    <button 
                        className={period === "7d" ? "active" : ""} 
                        onClick={() => setPeriod("7d")}
                    >7 Dias</button>
                    <button 
                        className={period === "30d" ? "active" : ""} 
                        onClick={() => setPeriod("30d")}
                    >30 Dias</button>
                </div>
            </header>

            <div className="metrics-grid">
                <div className="metric-card glass">
                    <div className="metric-icon ai-purple">
                        <Users size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="label">Leads Atendidos</span>
                        <h2 className="value">{metrics?.summary.leadsServed || 0}</h2>
                        <span className="trend positive">Únicos no período</span>
                    </div>
                </div>

                <div className="metric-card glass">
                    <div className="metric-icon ai-blue">
                        <MessageSquare size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="label">Respostas IA</span>
                        <h2 className="value">{metrics?.summary.totalAiMessages || 0}</h2>
                        <span className="trend">Mensagens enviadas</span>
                    </div>
                </div>

                <div className="metric-card glass">
                    <div className="metric-icon ai-green">
                        <UserCheck size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="label">Conversão Ativa</span>
                        <h2 className="value">{metrics?.summary.convertedLeads || 0}</h2>
                        <span className="trend positive">{metrics?.summary.efficiency}% de eficiência</span>
                    </div>
                </div>

                <div className="metric-card glass">
                    <div className="metric-icon ai-orange">
                        <TrendingUp size={24} />
                    </div>
                    <div className="metric-content">
                        <span className="label">IA vs Humano</span>
                        <h2 className="value">
                            {metrics?.summary && (metrics.summary.humanMessages + metrics.summary.totalAiMessages > 0)
                                ? Math.round((metrics.summary.totalAiMessages / (metrics.summary.totalAiMessages + metrics.summary.humanMessages)) * 100)
                                : 0}%
                        </h2>
                        <span className="trend">Carga de trabalho da IA</span>
                    </div>
                </div>
            </div>

            <div className="charts-section">
                <div className="chart-card glass">
                    <div className="chart-header">
                        <h3>Volume de Atendimento Diário</h3>
                        <p>Total de mensagens geradas pela inteligência artificial</p>
                    </div>
                    <div className="bar-chart-container">
                        {metrics?.chartData.length ? metrics.chartData.map((d, i) => {
                            const max = Math.max(...metrics.chartData.map(x => x.count)) || 1;
                            const height = Math.max((d.count / max) * 100, 5);
                            return (
                                <div key={i} className="bar-wrapper">
                                    <div 
                                        className="bar" 
                                        style={{ height: `${height}%` }}
                                    >
                                        <span className="tooltip">{d.count} msgs</span>
                                    </div>
                                    <span className="bar-label">{new Date(d.date + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                </div>
                            );
                        }) : (
                            <div className="empty-chart" style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                                Sem dados para este período
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .metrics-container {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                    color: var(--text-primary);
                }
                .metrics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 32px;
                }
                .header-info h1 {
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }
                .header-info p {
                    color: var(--text-secondary);
                    font-size: 14px;
                }
                .period-selector {
                    display: flex;
                    background: var(--bg-secondary);
                    padding: 4px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                .period-selector button {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    transition: all 0.2s;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }
                .period-selector button.active {
                    background: var(--bg-header);
                    color: var(--text-primary);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                    margin-bottom: 32px;
                }
                .metric-card {
                    display: flex;
                    align-items: center;
                    padding: 24px;
                    border-radius: 20px;
                    gap: 20px;
                }
                .metric-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .ai-purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
                .ai-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .ai-green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .ai-orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
                
                .metric-content .label {
                    font-size: 13px;
                    color: var(--text-secondary);
                    display: block;
                    margin-bottom: 4px;
                }
                .metric-content .value {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .metric-content .trend {
                    font-size: 11px;
                    color: var(--text-secondary);
                }
                .metric-content .trend.positive {
                    color: #22c55e;
                }
                .charts-section {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                .chart-card {
                    padding: 28px;
                    border-radius: 24px;
                }
                .chart-header {
                    margin-bottom: 40px;
                }
                .chart-header h3 {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .chart-header p {
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .bar-chart-container {
                    height: 200px;
                    display: flex;
                    align-items: flex-end;
                    gap: 12px;
                    padding-bottom: 60px;
                    border-bottom: 1px solid var(--border-color);
                }
                .bar-wrapper {
                    flex: 1;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-end;
                    position: relative;
                }
                .bar {
                    width: 100%;
                    max-width: 40px;
                    background: linear-gradient(180deg, var(--accent-blue) 0%, rgba(59, 130, 246, 0.3) 100%);
                    border-radius: 6px 6px 2px 2px;
                    transition: all 0.3s ease;
                    position: relative;
                    cursor: pointer;
                }
                .bar:hover {
                    filter: brightness(1.2);
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
                }
                .bar-label {
                    font-size: 10px;
                    color: var(--text-secondary);
                    margin-top: 12px;
                    white-space: nowrap;
                    transform: rotate(-45deg);
                    position: absolute;
                    bottom: -40px;
                }
                .tooltip {
                    position: absolute;
                    top: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--bg-header);
                    color: var(--text-primary);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                    white-space: nowrap;
                    border: 1px solid var(--border-color);
                }
                .bar:hover .tooltip {
                    opacity: 1;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
