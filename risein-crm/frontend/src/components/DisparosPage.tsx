"use client";

import { useState, useEffect } from "react";
import { Send, Users, MessageSquare, AlertCircle, CheckCircle2, Loader2, Clipboard } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { sendBulkMessages, type BulkContact } from "@/lib/api";

export default function DisparosPage() {
    const [contactsText, setContactsText] = useState("");
    const [message, setMessage] = useState("Olá {nome}, tudo bem?");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; lastContact?: string; status?: string } | null>(null);
    const [logs, setLogs] = useState<{ time: string; text: string; status: 'info' | 'success' | 'error' }[]>([]);

    useEffect(() => {
        const socket = getSocket();

        socket.on("bulk:progress", (data: { index: number; total: number; contact: BulkContact; status: string; error?: string }) => {
            setProgress({
                current: data.index + 1,
                total: data.total,
                lastContact: data.contact.name,
                status: data.status
            });

            const time = new Date().toLocaleTimeString();
            if (data.status === "success") {
                addLog(time, `Enviado com sucesso para ${data.contact.name}`, 'success');
            } else {
                addLog(time, `Falha ao enviar para ${data.contact.name}: ${data.error}`, 'error');
            }
        });

        socket.on("bulk:completed", (data: { total: number }) => {
            setIsProcessing(false);
            addLog(new Date().toLocaleTimeString(), `Disparo concluído! Total de ${data.total} mensagens processadas.`, 'info');
        });

        return () => {
            socket.off("bulk:progress");
            socket.off("bulk:completed");
        };
    }, []);

    const addLog = (time: string, text: string, status: 'info' | 'success' | 'error') => {
        setLogs(prev => [{ time, text, status }, ...prev].slice(0, 50));
    };

    const parseContacts = (): BulkContact[] => {
        return contactsText
            .split("\n")
            .map(line => {
                // Support comma, semicolon or tab as separator
                const parts = line.split(/[;,\t]/);
                if (parts.length >= 2) {
                    return {
                        name: parts[0].trim(),
                        phone: parts[1].trim().replace(/\D/g, "")
                    };
                }
                return null;
            })
            .filter((c): c is BulkContact => c !== null && c.phone.length >= 8);
    };

    const handleStart = async () => {
        const contacts = parseContacts();
        if (contacts.length === 0) {
            alert("Nenhum contato válido encontrado. Use o formato: Nome;Telefone");
            return;
        }
        if (!message.trim()) {
            alert("Por favor, digite uma mensagem.");
            return;
        }

        if (!confirm(`Deseja iniciar o disparo para ${contacts.length} contatos?`)) return;

        setIsProcessing(true);
        setLogs([]);
        addLog(new Date().toLocaleTimeString(), "Iniciando processamento da lista...", 'info');

        try {
            await sendBulkMessages({
                contacts,
                message,
                delayMin: 15, // A bit more conservative for safety
                delayMax: 35
            });
        } catch (err: any) {
            setIsProcessing(false);
            addLog(new Date().toLocaleTimeString(), `Erro ao iniciar: ${err.message}`, 'error');
        }
    };

    const contactsCount = parseContacts().length;

    return (
        <div className="disparos-container">
            <div className="disparos-header">
                <h1>Disparos em Massa</h1>
                <p>Envie mensagens personalizadas para múltiplos contatos com proteção anti-bloqueio.</p>
            </div>

            <div className="disparos-grid">
                <div className="disparos-panel main-panel">
                    <section className="input-section">
                        <div className="section-title">
                            <Users size={18} />
                            <h2>Lista de Contatos</h2>
                            <span className="badge">{contactsCount} detectados</span>
                        </div>
                        <p className="help-text">Cole do Excel ou digite no formato: <strong>Nome;Telefone</strong> (um por linha)</p>
                        <textarea
                            className="contacts-textarea"
                            placeholder="João Silva;11999999999&#10;Maria Oliveira;11888888888"
                            value={contactsText}
                            onChange={(e) => setContactsText(e.target.value)}
                            disabled={isProcessing}
                        />
                    </section>

                    <section className="message-section">
                        <div className="section-title">
                            <MessageSquare size={18} />
                            <h2>Mensagem Personalizada</h2>
                        </div>
                        <p className="help-text">Use <strong>{'{nome}'}</strong> para inserir o nome do contato automaticamente.</p>
                        <textarea
                            className="message-textarea"
                            placeholder="Olá {nome}, como posso te ajudar?"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isProcessing}
                        />
                    </section>

                    <div className="action-bar">
                        <button 
                            className={`btn-start ${isProcessing ? 'loading' : ''}`}
                            onClick={handleStart}
                            disabled={isProcessing || contactsCount === 0}
                        >
                            {isProcessing ? (
                                <><Loader2 className="animate-spin" size={20} /> Processando...</>
                            ) : (
                                <><Send size={20} /> Iniciar Disparos</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="disparos-panel side-panel">
                    <section className="status-section">
                        <div className="section-title">
                            <CheckCircle2 size={18} />
                            <h2>Progresso</h2>
                        </div>
                        
                        {progress ? (
                            <div className="progress-display">
                                <div className="progress-stats">
                                    <span className="count">{progress.current} / {progress.total}</span>
                                    <span className="percent">{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div 
                                        className="progress-bar-fill" 
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                                {progress.lastContact && (
                                    <p className="current-target">
                                        Ultimo: <strong>{progress.lastContact}</strong> 
                                        <span className={`status-tag ${progress.status}`}>{progress.status === 'success' ? 'Enviado' : 'Erro'}</span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Clipboard size={48} />
                                <p>Aguardando início dos disparos...</p>
                            </div>
                        )}
                    </section>

                    <section className="log-section">
                        <div className="section-title">
                            <AlertCircle size={18} />
                            <h2>Logs de Atividade</h2>
                        </div>
                        <div className="logs-container">
                            {logs.map((log, i) => (
                                <div key={i} className={`log-entry ${log.status}`}>
                                    <span className="log-time">[{log.time}]</span>
                                    <span className="log-text">{log.text}</span>
                                </div>
                            ))}
                            {logs.length === 0 && <p className="no-logs">Nenhuma atividade registrada.</p>}
                        </div>
                    </section>
                </div>
            </div>

            <style jsx>{`
                .disparos-container {
                    padding: 24px;
                    height: 100%;
                    overflow-y: auto;
                    color: var(--text-primary);
                }
                .disparos-header {
                    margin-bottom: 24px;
                }
                .disparos-header h1 {
                    font-size: 1.8rem;
                    margin-bottom: 4px;
                }
                .disparos-header p {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                .disparos-grid {
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: 20px;
                    align-items: start;
                }
                .disparos-panel {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .section-title h2 {
                    font-size: 1rem;
                    font-weight: 600;
                }
                .badge {
                    background: var(--accent-blue);
                    color: white;
                    font-size: 0.7rem;
                    padding: 2px 8px;
                    border-radius: 10px;
                    margin-left: auto;
                }
                .help-text {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }
                .contacts-textarea, .message-textarea {
                    width: 100%;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 12px;
                    color: var(--text-primary);
                    font-family: 'Inter', sans-serif;
                    resize: vertical;
                    min-height: 150px;
                }
                .contacts-textarea:focus, .message-textarea:focus {
                    outline: none;
                    border-color: var(--accent-blue);
                }
                .input-section {
                    margin-bottom: 24px;
                }
                .action-bar {
                    margin-top: 24px;
                    display: flex;
                    justify-content: flex-end;
                }
                .btn-start {
                    background: var(--accent-blue);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-start:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .btn-start:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .progress-display {
                    margin-top: 16px;
                }
                .progress-stats {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                }
                .progress-bar-container {
                    height: 8px;
                    background: var(--bg-primary);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: var(--accent-blue);
                    transition: width 0.3s ease;
                }
                .current-target {
                    font-size: 0.85rem;
                }
                .status-tag {
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-left: 8px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status-tag.success { background: #10b981; color: white; }
                .status-tag.error { background: #ef4444; color: white; }
                
                .logs-container {
                    margin-top: 16px;
                    background: var(--bg-primary);
                    border-radius: 8px;
                    height: 300px;
                    overflow-y: auto;
                    padding: 10px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.75rem;
                }
                .log-entry { margin-bottom: 6px; line-height: 1.4; }
                .log-time { color: var(--text-secondary); margin-right: 6px; }
                .log-entry.success { color: #10b981; }
                .log-entry.error { color: #ef4444; }
                .log-entry.info { color: var(--accent-blue); }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 0;
                    color: var(--text-secondary);
                    opacity: 0.5;
                }
                .empty-state p { margin-top: 12px; font-size: 0.9rem; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
