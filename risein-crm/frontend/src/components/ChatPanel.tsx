"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, Check, CheckCheck, FileText, Download } from "lucide-react";
import { fetchMessages, sendMessage as apiSendMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Lead, Message } from "@/lib/api";
import toast from "react-hot-toast";

interface ChatPanelProps {
    lead: Lead;
    isFullScreen?: boolean;
    onClose?: () => void;
}

export default function ChatPanel({ lead, isFullScreen, onClose }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load messages when lead changes
    useEffect(() => {
        if (!lead?.id) return;
        setIsLoading(true);
        setMessages([]);
        fetchMessages(lead.id)
            .then(data => {
                setMessages(Array.isArray(data) ? data : []);
            })
            .catch(() => setMessages([]))
            .finally(() => setIsLoading(false));
    }, [lead?.id]);

    // Scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Real-time socket listener — listen for incoming messages and status updates
    useEffect(() => {
        const socket = getSocket();
        
        const messageHandler = (msg: Message & { lead?: Lead }) => {
            const msgLeadId = msg.leadId || msg.lead?.id;
            if (msgLeadId === lead?.id) {
                setMessages(prev => {
                    // Avoid duplicate if optimistic message already added (check by content and timestamp if ID is different)
                    if (prev.some(m => m.id === msg.id || (m.status === "sending" && m.content === msg.content))) {
                        return prev.map(m => (m.status === "sending" && m.content === msg.content) ? msg : m);
                    }
                    return [...prev, msg];
                });
            }
        };

        const statusHandler = ({ messageId, status }: { messageId: string, status: string }) => {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
        };

        socket.on("new_message", messageHandler);
        socket.on("message:sent", messageHandler);
        socket.on("message:status", statusHandler);

        return () => {
            socket.off("new_message", messageHandler);
            socket.off("message:sent", messageHandler);
            socket.off("message:status", statusHandler);
        };
    }, [lead?.id]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const content = newMessage.trim();
        if (!content) return;
        setNewMessage("");

        // Optimistic UI: add message immediately
        const optimisticId = `opt-${Date.now()}`;
        const optimisticMsg: Message = {
            id: optimisticId,
            content,
            isFromMe: true,
            leadId: lead.id,
            timestamp: new Date().toISOString(),
            status: "sending",
            type: "text",
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const result = await apiSendMessage(lead.id, content) as Message & { warning?: string };
            // Replace optimistic msg with real one from server
            setMessages(prev => prev.map(m => m.id === optimisticId ? result : m));
            if (result.warning) {
                toast.error(`⚠️ WhatsApp offline: mensagem salva mas não enviada.`, { duration: 5000 });
            }
        } catch (err: unknown) {
            console.error("Error sending message:", err);
            // Remove optimistic message and show error
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            toast.error("Erro ao enviar mensagem. Verifique a conexão.");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderStatus = (msg: Message) => {
        if (!msg.isFromMe) return null;
        
        const color = msg.status === "READ" ? "#53bdeb" : "#8696a0";
        
        if (msg.status === "sending") {
            return <Check size={14} style={{ opacity: 0.5 }} />;
        }
        if (msg.status === "SENT") {
            return <Check size={14} color="#8696a0" />;
        }
        if (msg.status === "DELIVERED" || msg.status === "READ") {
            return <CheckCheck size={14} color={color} />;
        }
        if (msg.status === "failed") {
            return <span style={{ color: "#ef4444", fontSize: 10 }}>Falhou</span>;
        }
        return <Check size={14} color="#8696a0" />;
    };

    const renderMedia = (msg: Message) => {
        if (!msg.mediaUrl) return null;

        const url = msg.mediaUrl.startsWith("http") ? msg.mediaUrl : `${window.location.protocol}//${window.location.host}${msg.mediaUrl}`;

        if (msg.type === "image") {
            return (
                <div style={{ marginBottom: 4, borderRadius: 4, overflow: "hidden" }}>
                    <img 
                        src={url} 
                        alt="Mídia" 
                        style={{ maxWidth: "100%", maxHeight: 300, display: "block", cursor: "pointer" }} 
                        onClick={() => window.open(url, '_blank')}
                        loading="lazy"
                    />
                </div>
            );
        }

        if (msg.type === "video") {
            return (
                <div style={{ marginBottom: 4 }}>
                    <video controls style={{ maxWidth: "100%", borderRadius: 4 }} preload="metadata">
                        <source src={url} type={msg.mimeType || "video/mp4"} />
                    </video>
                </div>
            );
        }

        if (msg.type === "audio" || msg.type === "ptt") {
            return (
                <div style={{ marginBottom: 4, minWidth: 200 }}>
                    <audio controls style={{ width: "100%", height: 32 }} preload="metadata">
                        <source src={url} type={msg.mimeType || "audio/ogg"} />
                    </audio>
                </div>
            );
        }

        return (
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    padding: "8px 12px", 
                    background: "rgba(0,0,0,0.1)", 
                    borderRadius: 4,
                    color: "#e9edef",
                    textDecoration: "none",
                    marginBottom: 4
                }}
            >
                <FileText size={20} />
                <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.mimeType?.split("/")[1]?.toUpperCase() || "Documento"}
                </span>
                <Download size={16} />
            </a>
        );
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "#0b141a",
            position: "absolute",
            inset: 0,
        }}>
            {/* Header */}
            <div style={{
                background: "#202c33",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #222d34",
                zIndex: 10,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: "50%", background: "#6b7280",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 700, fontSize: 18,
                        overflow: "hidden", flexShrink: 0,
                    }}>
                        {lead.avatarUrl
                            ? <img src={lead.avatarUrl} alt={lead.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : (lead.name?.charAt(0)?.toUpperCase() || "U")
                        }
                    </div>
                    <div>
                        <div style={{ color: "#e9edef", fontWeight: 500, fontSize: 15, lineHeight: 1.3 }}>{lead.name}</div>
                        <div style={{ color: "#8696a0", fontSize: 12 }}>{lead.phone}</div>
                    </div>
                </div>
                {onClose && isFullScreen !== true && (
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", color: "#8696a0", cursor: "pointer", padding: 4 }}
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 5%",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "#0b141a",
            }}>
                {isLoading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#8696a0" }}>
                        Carregando mensagens...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#8696a0", textAlign: "center" }}>
                        <div>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                            <div>Nenhuma mensagem ainda.</div>
                            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>Envie uma mensagem para iniciar a conversa.</div>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                display: "flex",
                                justifyContent: msg.isFromMe ? "flex-end" : "flex-start",
                                width: "100%",
                                marginBottom: 2,
                            }}
                        >
                            <div style={{
                                maxWidth: "75%",
                                padding: "6px 10px 4px",
                                borderRadius: msg.isFromMe ? "8px 0 8px 8px" : "0 8px 8px 8px",
                                background: msg.isFromMe ? "#005c4b" : "#202c33",
                                color: "#e9edef",
                                fontSize: 14,
                                wordBreak: "break-word",
                                boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                                position: "relative",
                            }}>
                                {renderMedia(msg)}
                                {msg.content && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 4,
                                    marginTop: 2,
                                    minWidth: 60,
                                }}>
                                    <span style={{
                                        fontSize: 11,
                                        color: "rgba(233,237,239,0.6)",
                                    }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    {renderStatus(msg)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form
                onSubmit={handleSend}
                style={{
                    background: "#202c33",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderTop: "1px solid #222d34",
                    flexShrink: 0,
                }}
            >
                <button type="button" style={{ background: "none", border: "none", color: "#8696a0", cursor: "pointer", padding: 4 }}>
                    <Paperclip size={22} />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mensagem"
                    style={{
                        flex: 1,
                        background: "#2a3942",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 12px",
                        color: "#e9edef",
                        fontSize: 15,
                        outline: "none",
                    }}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    style={{
                        background: "none",
                        border: "none",
                        color: newMessage.trim() ? "#00a884" : "#8696a0",
                        cursor: newMessage.trim() ? "pointer" : "default",
                        padding: 4,
                        transition: "color 0.2s",
                    }}
                >
                    <Send size={24} />
                </button>
            </form>
        </div>
    );
}
