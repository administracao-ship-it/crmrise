"use client";

import { useState, useEffect, useRef } from "react";
import { 
    Send, Users, MessageSquare, AlertCircle, CheckCircle2, 
    Loader2, Clipboard, FileType, Image as ImageIcon, 
    History, Download, Trash2, ExternalLink 
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { 
    sendBulkMessages, fetchBulkHistory, uploadCampaignMedia, 
    type BulkContact, type BulkJob 
} from "@/lib/api";
import * as XLSX from 'xlsx';

export default function DisparosPage() {
    const [contactsText, setContactsText] = useState("");
    const [message, setMessage] = useState("Olá {nome}, tudo bem?");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; lastContact?: string; status?: string } | null>(null);
    const [logs, setLogs] = useState<{ time: string; text: string; status: 'info' | 'success' | 'error' }[]>([]);
    const [history, setHistory] = useState<BulkJob[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<{ file: File; url: string; preview: string } | null>(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [activeTab, setActiveTab] = useState<'disparo' | 'historico'>('disparo');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadHistory();
        const socket = getSocket();

        socket.on("bulk:progress", (data: { index: number; total: number; contact: BulkContact; status: string; error?: string }) => {
            setProgress({
                current: data.index,
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

        socket.on("bulk:completed", (data: { total: number; success: number; error: number }) => {
            setIsProcessing(false);
            addLog(new Date().toLocaleTimeString(), `Disparo concluído! Sucesso: ${data.success}, Erro: ${data.error}`, 'info');
            loadHistory(); // Refresh history
        });

        return () => {
            socket.off("bulk:progress");
            socket.off("bulk:completed");
        };
    }, []);

    const loadHistory = async () => {
        try {
            const data = await fetchBulkHistory();
            setHistory(data);
        } catch (err) {
            console.error("Erro ao carregar histórico:", err);
        }
    };

    const addLog = (time: string, text: string, status: 'info' | 'success' | 'error') => {
        setLogs(prev => [{ time, text, status }, ...prev].slice(0, 50));
    };

    const parseContacts = (): BulkContact[] => {
        return contactsText
            .split("\n")
            .map(line => {
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                const formatted = data
                    .filter(row => row.length >= 2 && row[0] && row[1])
                    .map(row => `${row[0]};${row[1]}`)
                    .join("\n");

                setContactsText(prev => prev ? prev + "\n" + formatted : formatted);
                addLog(new Date().toLocaleTimeString(), `Importados ${data.length} contatos da planilha.`, 'info');
            } catch (err) {
                alert("Erro ao ler planilha. Verifique o formato.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setSelectedMedia({
            file,
            url: "",
            preview: previewUrl
        });
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Nome;Telefone\nJoão Silva;5511999998888\nMaria Oliveira;5511988887777";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_disparo.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            let mediaUrl = "";
            if (selectedMedia) {
                setIsUploadingMedia(true);
                const uploadRes = await uploadCampaignMedia(selectedMedia.file);
                mediaUrl = uploadRes.mediaUrl;
                setIsUploadingMedia(false);
            }

            await sendBulkMessages({
                contacts,
                message,
                mediaUrl,
                delayMin: 10,
                delayMax: 20
            });
            
            // Success response means it started in background
        } catch (err: any) {
            setIsProcessing(false);
            setIsUploadingMedia(false);
            addLog(new Date().toLocaleTimeString(), `Erro ao iniciar: ${err.message}`, 'error');
        }
    };

    const contactsCount = parseContacts().length;

    return (
        <div className="disparos-container">
            <div className="disparos-header">
                <div className="header-top">
                    <div>
                        <h1>Disparos em Massa</h1>
                        <p>Envie mensagens personalizadas para múltiplos contatos com proteção anti-bloqueio.</p>
                    </div>
                    <div className="tab-switcher">
                        <button 
                            className={activeTab === 'disparo' ? 'active' : ''} 
                            onClick={() => setActiveTab('disparo')}
                        >
                            <Send size={16} /> Disparo
                        </button>
                        <button 
                            className={activeTab === 'historico' ? 'active' : ''} 
                            onClick={() => setActiveTab('historico')}
                        >
                            <History size={16} /> Histórico
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'disparo' ? (
                <div className="disparos-grid">
                    <div className="disparos-panel main-panel">
                        <section className="input-section">
                            <div className="section-title">
                                <Users size={18} />
                                <h2>Lista de Contatos</h2>
                                <div className="actions-group">
                                    <button className="btn-icon-text" onClick={downloadTemplate}>
                                        <Download size={14} /> Modelo
                                    </button>
                                    <button className="btn-icon-text" onClick={() => fileInputRef.current?.click()}>
                                        <FileType size={14} /> Planilha
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        hidden 
                                        accept=".xlsx,.xls,.csv" 
                                        onChange={handleFileUpload} 
                                    />
                                </div>
                                <span className="badge">{contactsCount} detectados</span>
                            </div>
                            <p className="help-text">Cole do Excel ou suba uma planilha no formato: <strong>Nome;Telefone</strong></p>
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
                                <h2>Mensagem e Mídia</h2>
                                <div className="actions-group">
                                    <button 
                                        className={`btn-icon-text ${selectedMedia ? 'active' : ''}`}
                                        onClick={() => mediaInputRef.current?.click()}
                                    >
                                        <ImageIcon size={14} /> {selectedMedia ? "Trocar Mídia" : "Anexar Mídia"}
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={mediaInputRef} 
                                        hidden 
                                        accept="image/*,video/*" 
                                        onChange={handleMediaUpload} 
                                    />
                                </div>
                            </div>

                            {selectedMedia && (
                                <div className="media-preview-container">
                                    <div className="media-preview">
                                        {selectedMedia.file.type.startsWith('image') ? (
                                            <img src={selectedMedia.preview} alt="Preview" />
                                        ) : (
                                            <video src={selectedMedia.preview} />
                                        )}
                                        <button className="btn-remove-media" onClick={() => setSelectedMedia(null)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="media-info">
                                        <p>{selectedMedia.file.name}</p>
                                        <span>{(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                </div>
                            )}

                            <p className="help-text">Use <strong>{'{nome}'}</strong> para personalizar. Mídias são enviadas antes do texto.</p>
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
                                disabled={isProcessing || contactsCount === 0 || isUploadingMedia}
                            >
                                {isProcessing || isUploadingMedia ? (
                                    <><Loader2 className="animate-spin" size={20} /> {isUploadingMedia ? "Subindo Mídia..." : "Processando..."}</>
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
                                <h2>Logs ao Vivo</h2>
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
            ) : (
                <div className="history-list">
                    {history.length === 0 ? (
                        <div className="disparos-panel empty-history">
                            <History size={48} />
                            <h3>Nenhum Histórico</h3>
                            <p>Seus disparos finalizados aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="history-grid">
                            {history.map(job => (
                                <div key={job.id} className="history-card disparos-panel">
                                    <div className="card-header">
                                        <span className="job-date">{new Date(job.createdAt).toLocaleString()}</span>
                                        <span className={`job-status ${job.status}`}>{job.status}</span>
                                    </div>
                                    <p className="job-message">{job.message.length > 100 ? job.message.substring(0, 100) + '...' : job.message}</p>
                                    {job.mediaUrl && (
                                        <div className="job-media-info">
                                            <ImageIcon size={14} /> Mídia Anexada
                                        </div>
                                    )}
                                    <div className="card-footer">
                                        <div className="job-progress">
                                            <div className="progress-mini">
                                                <div className="fill" style={{ width: `${(job.processedCount / job.totalContacts) * 100}%` }}></div>
                                            </div>
                                            <span>{job.processedCount} / {job.totalContacts}</span>
                                        </div>
                                        <div className="job-stats">
                                            <span className="success">{job.successCount} ✅</span>
                                            <span className="error">{job.errorCount} ❌</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .disparos-header h1 {
                    font-size: 1.8rem;
                    margin-bottom: 4px;
                }
                .disparos-header p {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                .tab-switcher {
                    display: flex;
                    background: var(--bg-primary);
                    padding: 4px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .tab-switcher button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 16px;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-switcher button.active {
                    background: var(--bg-secondary);
                    color: var(--accent-blue);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
                .actions-group {
                    display: flex;
                    gap: 8px;
                    margin-left: 12px;
                }
                .btn-icon-text {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-icon-text:hover {
                    border-color: var(--accent-blue);
                    color: var(--accent-blue);
                }
                .btn-icon-text.active {
                    background: var(--accent-blue);
                    color: white;
                    border-color: var(--accent-blue);
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
                .media-preview-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    padding: 10px;
                    background: var(--bg-primary);
                    border-radius: 8px;
                    border: 1px dashed var(--border-color);
                }
                .media-preview {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    border-radius: 4px;
                    overflow: hidden;
                    background: black;
                }
                .media-preview img, .media-preview video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .btn-remove-media {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 2px;
                    cursor: pointer;
                }
                .media-info p {
                    font-size: 0.8rem;
                    font-weight: 600;
                    margin-bottom: 2px;
                    max-width: 200px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .media-info span {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }
                .current-target { font-size: 0.85rem; margin-top: 10px; }
                .status-tag { 
                    font-size: 0.65rem; padding: 2px 4px; border-radius: 4px; margin-left: 6px; 
                    background: #10b981; color: white;
                }
                .status-tag.error { background: #ef4444; }

                .action-bar { margin-top: 24px; display: flex; justify-content: flex-end; }
                .btn-start {
                    background: var(--accent-blue); color: white; border: none; border-radius: 8px;
                    padding: 12px 24px; font-weight: 600; display: flex; align-items: center; gap: 8px;
                    cursor: pointer; transition: all 0.2s;
                }
                .btn-start:disabled { opacity: 0.5; cursor: not-allowed; }

                .history-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 16px;
                }
                .history-card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .job-date { font-size: 0.8rem; color: var(--text-secondary); }
                .job-status {
                    font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;
                    background: #3b82f6; color: white; text-transform: uppercase;
                }
                .job-status.COMPLETED { background: #10b981; }
                .job-message { font-size: 0.9rem; color: var(--text-primary); line-height: 1.4; }
                .job-media-info {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 0.75rem; color: var(--accent-blue);
                }
                .card-footer {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color);
                }
                .job-progress { display: flex; align-items: center; gap: 8px; flex: 1; }
                .progress-mini {
                    height: 4px; background: var(--bg-primary); border-radius: 2px; flex: 1;
                    max-width: 100px;
                }
                .progress-mini .fill { height: 100%; background: var(--accent-blue); border-radius: 2px; }
                .job-progress span { font-size: 0.75rem; color: var(--text-secondary); }
                .job-stats { display: flex; gap: 12px; font-size: 0.8rem; font-weight: 600; }
                .job-stats .success { color: #10b981; }
                .job-stats .error { color: #ef4444; }

                .empty-history {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 60px; color: var(--text-secondary); opacity: 0.7;
                }
                .empty-history h3 { margin: 16px 0 4px; color: var(--text-primary); }

                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .logs-container {
                    margin-top: 16px; background: var(--bg-primary); border-radius: 8px;
                    height: 300px; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.75rem;
                }
                .log-entry { margin-bottom: 4px; }
                .log-time { color: var(--text-secondary); margin-right: 6px; }
                .log-entry.success { color: #10b981; }
                .log-entry.error { color: #ef4444; }
                .log-entry.info { color: #3b82f6; }
            `}</style>
        </div>
    );
}
