import React, { useState, useEffect } from "react";
import { Save, Bot, MessageCircle, Sliders, Tags, Loader2, RefreshCw, Key, Power, Pencil, Trash2 } from "lucide-react";
import { fetchTags, createTag, deleteTag, syncAllAvatars } from "@/lib/api";
import toast from "react-hot-toast";

export default function SettingsPage({
    funnelName,
    onUpdateFunnelName,
    openAiApiKey,
    systemPrompt,
    humanTakeoverMessage,
    aiTriggerMessages,
    onUpdateOpenAi,
    whatsappStatus,
    onOpenWhatsAppModal,
    stages,
    ...props
}: any) {
    const [activeSection, setActiveSection] = useState("integrações");
    
    // Form States
    const [localFunnelName, setLocalFunnelName] = useState(funnelName || "");
    const [localApiKey, setLocalApiKey] = useState(openAiApiKey || "");
    const [localPrompt, setLocalPrompt] = useState(systemPrompt || "");
    const [localTakeover, setLocalTakeover] = useState(humanTakeoverMessage || "Olá, tudo bem?");
    const [localTriggers, setLocalTriggers] = useState<string[]>([]);
    const [newTrigger, setNewTrigger] = useState("");
    const [syncing, setSyncing] = useState(false);

    const [tags, setTags] = useState<any[]>([]);
    const [loadingTags, setLoadingTags] = useState(false);

    useEffect(() => {
        setLocalFunnelName(funnelName || "");
        setLocalApiKey(openAiApiKey || "");
        setLocalPrompt(systemPrompt || "");
        setLocalTakeover(humanTakeoverMessage || "Olá, tudo bem?");
        try {
            setLocalTriggers(JSON.parse(aiTriggerMessages || "[]"));
        } catch (e) {
            setLocalTriggers([]);
        }
    }, [funnelName, openAiApiKey, systemPrompt, humanTakeoverMessage, aiTriggerMessages]);

    const handleAddTrigger = () => {
        if (!newTrigger.trim()) return;
        if (localTriggers.includes(newTrigger.trim())) return;
        const updated = [...localTriggers, newTrigger.trim()];
        setLocalTriggers(updated);
        setNewTrigger("");
        onUpdateOpenAi({ aiTriggerMessages: JSON.stringify(updated) });
    };

    useEffect(() => {
        if (activeSection === "etiquetas") {
            loadTags();
        }
    }, [activeSection]);

    const loadTags = async () => {
        try {
            setLoadingTags(true);
            const data = await fetchTags();
            setTags(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTags(false);
        }
    };

    const handleSaveGeneral = () => {
        onUpdateFunnelName(localFunnelName);
    };

    const handleSaveAI = () => {
        onUpdateOpenAi(localApiKey, localPrompt);
    };

    const handleSyncAllAvatars = async () => {
        setSyncing(true);
        try {
            const res = await syncAllAvatars();
            toast.success(res.message);
        } catch (e) {
            toast.error("Erro ao iniciar sincronização");
        } finally {
            setSyncing(false);
        }
    };

    const whatsappText = 
        whatsappStatus === "connected" || whatsappStatus === "authenticated" ? "Conectado" :
        whatsappStatus === "waiting_qr" ? "Aguardando QR Code" :
        (whatsappStatus === "initializing" || whatsappStatus === "loading") ? "Iniciando..." : 
        "Desconectado";

    const whatsappColor = 
        whatsappStatus === "connected" || whatsappStatus === "authenticated" ? "#10b981" :
        whatsappStatus === "waiting_qr" || whatsappStatus === "initializing" || whatsappStatus === "loading" ? "#f59e0b" : 
        "#ef4444";

    return (
        <div style={{ display: "flex", height: "100%", background: "var(--bg-primary)" }}>
            {/* Sidebar Interna das Configurações */}
            <div style={{ 
                width: "260px", 
                borderRight: "1px solid var(--border-color)", 
                background: "var(--bg-card)",
                padding: "24px 16px"
            }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "24px", paddingLeft: "12px" }}>Configurações</h2>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button 
                        onClick={() => setActiveSection("geral")}
                        style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "12px", borderRadius: "8px", border: "none",
                            background: activeSection === "geral" ? "var(--bg-hover)" : "transparent",
                            color: activeSection === "geral" ? "var(--text-primary)" : "var(--text-secondary)",
                            fontWeight: activeSection === "geral" ? 600 : 500,
                            cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s"
                        }}
                    >
                        <Sliders size={16} /> Geral
                    </button>
                    
                    <button 
                        onClick={() => setActiveSection("integrações")}
                        style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "12px", borderRadius: "8px", border: "none",
                            background: activeSection === "integrações" ? "var(--bg-hover)" : "transparent",
                            color: activeSection === "integrações" ? "var(--text-primary)" : "var(--text-secondary)",
                            fontWeight: activeSection === "integrações" ? 600 : 500,
                            cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s"
                        }}
                    >
                        <Power size={16} /> Integrações e IA
                    </button>

                    <button 
                        onClick={() => setActiveSection("etiquetas")}
                        style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "12px", borderRadius: "8px", border: "none",
                            background: activeSection === "etiquetas" ? "var(--bg-hover)" : "transparent",
                            color: activeSection === "etiquetas" ? "var(--text-primary)" : "var(--text-secondary)",
                            fontWeight: activeSection === "etiquetas" ? 600 : 500,
                            cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s"
                        }}
                    >
                        <Tags size={16} /> Kanban & Etiquetas
                    </button>

                    <button 
                        onClick={() => setActiveSection("manutencao")}
                        style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "12px", borderRadius: "8px", border: "none",
                            background: activeSection === "manutencao" ? "var(--bg-hover)" : "transparent",
                            color: activeSection === "manutencao" ? "var(--text-primary)" : "var(--text-secondary)",
                            fontWeight: activeSection === "manutencao" ? 600 : 500,
                            cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s"
                        }}
                    >
                        <RefreshCw size={16} /> Manutenção
                    </button>
                </div>
            </div>

            {/* Área de Conteúdo */}
            <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
                <div style={{ maxWidth: "800px" }}>
                    
                    {activeSection === "geral" && (
                        <div className="fade-in">
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Configurações Gerais</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>
                                Ajuste as preferências globais do seu CRM Rise.
                            </p>

                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                <div className="form-group" style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
                                        Nome do Pipeline / Empresa
                                    </label>
                                    <input 
                                        type="text" 
                                        value={localFunnelName} 
                                        onChange={(e) => setLocalFunnelName(e.target.value)}
                                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                                    />
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginTop: "6px" }}>
                                        Este nome aparece no topo esquerdo do painel principal.
                                    </span>
                                </div>
                                
                                <div className="form-group" style={{ marginBottom: "24px", opacity: 0.6, pointerEvents: "none" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
                                        Fuso Horário
                                    </label>
                                    <input 
                                        type="text" 
                                        value="America/Sao_Paulo (BRT)" 
                                        readOnly
                                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                                    />
                                </div>

                                <button 
                                    className="btn-primary" 
                                    onClick={handleSaveGeneral}
                                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                                >
                                    <Save size={16} /> Salvar Alterações
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === "integrações" && (
                        <div className="fade-in">
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Integrações e Inteligência Artificial</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>
                                Conecte seus serviços externos para habilitar o robô de vendas automáticas.
                            </p>

                            {/* Card do WhatsApp */}
                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                        <div style={{ background: "rgba(37, 211, 102, 0.1)", padding: "12px", borderRadius: "10px", color: "#25D366" }}>
                                            <MessageCircle size={24} />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: "1.1rem", marginBottom: "4px", fontWeight: 600 }}>WhatsApp Web</h4>
                                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                                                Canal de comunicação com os leads.
                                            </p>
                                            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: whatsappColor }}>
                                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: whatsappColor }} />
                                                {whatsappText}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={onOpenWhatsAppModal} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Sliders size={16} /> Configurar Dispositivo
                                    </button>
                                </div>
                            </div>

                            {/* --- OPENAI CONFIGURATION --- */}
                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "24px" }}>
                                    <div style={{ background: "rgba(16, 163, 127, 0.1)", padding: "12px", borderRadius: "10px", color: "#10a37f" }}>
                                        <Bot size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "1.1rem", marginBottom: "4px", fontWeight: 600 }}>OpenAI (ChatGPT)</h4>
                                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                                            Configure a chave da API para habilitar os recursos de inteligência artificial.
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
                                        <Key size={14} /> Chave de API (OpenAI)
                                    </label>
                                    <input 
                                        type="password" 
                                        value={localApiKey} 
                                        onChange={(e) => setLocalApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                                    />
                                    <button 
                                        className="btn-primary" 
                                        onClick={() => onUpdateOpenAi({ openAiApiKey: localApiKey })}
                                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", marginTop: "16px" }}
                                    >
                                        <Save size={16} /> Salvar Chave
                                    </button>
                                </div>
                            </div>

                            {/* --- PROMPT DA IA --- */}
                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                                    <div style={{ background: "rgba(139, 92, 246, 0.1)", padding: "8px", borderRadius: "8px", color: "#8b5cf6" }}>
                                        <Bot size={20} />
                                    </div>
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Prompt da IA</h4>
                                </div>

                                <div style={{ 
                                    background: "rgba(239, 68, 68, 0.05)", 
                                    border: "1px dashed rgba(239, 68, 68, 0.3)", 
                                    padding: "16px", 
                                    borderRadius: "8px",
                                    marginBottom: "16px",
                                    color: "#ef4444",
                                    display: "flex",
                                    gap: "12px",
                                    alignItems: "flex-start"
                                }}>
                                    <div style={{ marginTop: "2px" }}><Save size={16} /></div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                        REGRAS PRIORITÁRIAS:<br/>
                                        <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                                            Estas instruções moldam a personalidade e limites do robô.
                                        </span>
                                    </div>
                                </div>

                                <textarea 
                                    value={localPrompt} 
                                    onChange={(e) => setLocalPrompt(e.target.value)}
                                    rows={8}
                                    placeholder="Ex: Você é um vendedor atencioso. Use emojis moderadamente. Nunca fale de preços sem perguntar o nome..."
                                    style={{ width: "100%", padding: "15px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", resize: "vertical", fontSize: "0.9rem", lineHeight: "1.5" }}
                                />

                                <button 
                                    className="btn-primary" 
                                    onClick={() => onUpdateOpenAi({ systemPrompt: localPrompt })}
                                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", marginTop: "16px" }}
                                >
                                    <Save size={16} /> Atualizar Prompt
                                </button>
                            </div>

                            {/* --- HUMAN TAKEOVER --- */}
                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                                    <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "8px", borderRadius: "8px", color: "#f59e0b" }}>
                                        <Power size={20} />
                                    </div>
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Mensagem de Takeover Humano</h4>
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                                    Quando essa mensagem exata for enviada pelo CRM, a IA será pausada automaticamente para aquele lead.
                                </p>

                                <input 
                                    type="text" 
                                    value={localTakeover} 
                                    onChange={(e) => setLocalTakeover(e.target.value)}
                                    placeholder="Ex: Olá, tudo bem?"
                                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                                />

                                <button 
                                    className="btn-primary" 
                                    onClick={() => onUpdateOpenAi({ humanTakeoverMessage: localTakeover })}
                                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", marginTop: "16px" }}
                                >
                                    <Save size={16} /> Salvar Takeover
                                </button>
                            </div>

                            {/* --- AI TRIGGERS --- */}
                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "32px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "8px", borderRadius: "8px", color: "#10b981" }}>
                                        <MessageCircle size={20} />
                                    </div>
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Mensagens Gatilho da IA</h4>
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
                                    Adicione as mensagens de gatilho que ativam a IA. Quando o lead enviar uma mensagem que contém qualquer um desses textos, a IA será ativada.
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                                    {localTriggers.map((trigger, idx) => (
                                        <div key={idx} style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            justifyContent: "space-between", 
                                            padding: "10px 16px", 
                                            background: "var(--bg-primary)", 
                                            borderRadius: "8px", 
                                            border: "1px solid var(--border-color)" 
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{idx + 1}.</span>
                                                <span style={{ fontSize: "0.9rem" }}>{trigger}</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const newTriggers = localTriggers.filter((_, i) => i !== idx);
                                                    setLocalTriggers(newTriggers);
                                                    onUpdateOpenAi({ aiTriggerMessages: JSON.stringify(newTriggers) });
                                                }}
                                                style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: "flex", gap: "10px" }}>
                                    <input 
                                        type="text" 
                                        value={newTrigger}
                                        onChange={(e) => setNewTrigger(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTrigger()}
                                        placeholder="Novo gatilho..."
                                        style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                                    />
                                    <button 
                                        onClick={handleAddTrigger}
                                        className="btn-secondary" 
                                        style={{ padding: "0 16px", borderRadius: "8px" }}
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "etiquetas" && (
                        <div className="fade-in">
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Kanban & Etiquetas</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>
                                Visualize os estágios do seu processo de vendas e etiquetas do sistema.
                            </p>

                            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                                {/* Tabela Estágios */}
                                <div style={{ flex: 1, background: "var(--bg-card)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                        <h4 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>Colunas do Kanban</h4>
                                        <span style={{ fontSize: "0.8rem", background: "var(--bg-hover)", padding: "4px 8px", borderRadius: "4px" }}>Visualização</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {stages.map((stg: Record<string, any>) => (
                                            <div key={stg.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "var(--bg-primary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                                                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{stg.name}</span>
                                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ID: {stg.id}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: "16px", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
                                        A edição de estágios é feita diretamente no quadro Kanban ao clicar no ícone de lápis.
                                    </div>
                                </div>

                                {/* Tabela Etiquetas (se for implementar tags depois) */}
                                <div style={{ flex: 1, background: "var(--bg-card)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                        <h4 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>Etiquetas (Tags)</h4>
                                        <span style={{ fontSize: "0.8rem", background: "var(--bg-hover)", padding: "4px 8px", borderRadius: "4px" }}>{tags.length} labels</span>
                                    </div>
                                    {loadingTags ? (
                                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                                            <Loader2 size={20} className="animate-spin" />
                                        </div>
                                    ) : (
                                        tags.length > 0 ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                {tags.map((tag: any) => (
                                                    <div key={tag.id} style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "var(--bg-primary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                                                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: tag.color || "var(--accent-blue)", marginRight: "12px" }} />
                                                        <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{tag.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                                                Nenhuma etiqueta configurada. As etiquetas ajudam a categorizar seus leads.
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {activeSection === "manutencao" && (
                        <div className="fade-in">
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Manutenção do Sistema</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>
                                Execute tarefas de limpeza e sincronização de dados.
                            </p>

                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                        <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "12px", borderRadius: "10px", color: "var(--accent-blue)" }}>
                                            <RefreshCw size={24} className={syncing ? "animate-spin" : ""} />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: "1.1rem", marginBottom: "4px", fontWeight: 600 }}>Sincronizar Fotos de Perfil</h4>
                                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, maxWidth: "400px" }}>
                                                Busca as fotos de perfil do WhatsApp para todos os leads que ainda não possuem imagem. 
                                                Este processo roda em segundo plano para não travar o sistema.
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleSyncAllAvatars} 
                                        disabled={syncing}
                                        className="btn-primary" 
                                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                    >
                                        {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                        {syncing ? "Sincronizando..." : "Iniciar Sincronização"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
