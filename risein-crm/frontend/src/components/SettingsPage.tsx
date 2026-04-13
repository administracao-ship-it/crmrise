import React, { useState, useEffect } from "react";
import { Save, Bot, MessageCircle, Sliders, Tags, Loader2, RefreshCw, Key, Power, Pencil, Trash2 } from "lucide-react";
import { fetchTags, createTag, deleteTag } from "@/lib/api";

export default function SettingsPage({
    funnelName,
    onUpdateFunnelName,
    openAiApiKey,
    systemPrompt,
    onUpdateOpenAi,
    whatsappStatus,
    onOpenWhatsAppModal,
    stages,
}: any) {
    const [activeSection, setActiveSection] = useState("integrações");
    
    // Form States
    const [localFunnelName, setLocalFunnelName] = useState(funnelName || "");
    const [localApiKey, setLocalApiKey] = useState(openAiApiKey || "");
    const [localPrompt, setLocalPrompt] = useState(systemPrompt || "");

    const [tags, setTags] = useState<any[]>([]);
    const [loadingTags, setLoadingTags] = useState(false);

    useEffect(() => {
        setLocalFunnelName(funnelName || "");
        setLocalApiKey(openAiApiKey || "");
        setLocalPrompt(systemPrompt || "");
    }, [funnelName, openAiApiKey, systemPrompt]);

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

                            {/* Card OpenAI */}
                            <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "24px" }}>
                                    <div style={{ background: "rgba(16, 163, 127, 0.1)", padding: "12px", borderRadius: "10px", color: "#10a37f" }}>
                                        <Bot size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "1.1rem", marginBottom: "4px", fontWeight: 600 }}>OpenAI (ChatGPT)</h4>
                                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                                            Configurações do comportamento do seu robô vendedor.
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="form-group" style={{ marginBottom: "20px" }}>
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
                                </div>

                                <div className="form-group" style={{ marginBottom: "24px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
                                        Comportamento Base (System Prompt)
                                    </label>
                                    <textarea 
                                        value={localPrompt} 
                                        onChange={(e) => setLocalPrompt(e.target.value)}
                                        rows={6}
                                        placeholder="Você é um vendedor especialista..."
                                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", resize: "vertical" }}
                                    />
                                </div>

                                <button 
                                    className="btn-primary" 
                                    onClick={handleSaveAI}
                                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                                >
                                    <Save size={16} /> Salvar Inteligência
                                </button>
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

                </div>
            </div>
        </div>
    );
}
