"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { fetchMessages, sendMessage as apiSendMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Lead, Message } from "@/lib/api";

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

    // Real-time socket listener
    useEffect(() => {
        const socket = getSocket();
        const handler = (msg: Message) => {
            if (msg.leadId === lead?.id) {
                setMessages(prev => [msg, ...prev]);
            }
        };
        socket.on("new_message", handler);
        return () => { socket.off("new_message", handler); };
    }, [lead?.id]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const content = newMessage.trim();
        if (!content) return;
        setNewMessage("");
        try {
            await apiSendMessage(lead.id, content);
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!lead) return null;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                background: "#0b141a",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div style={{
                height: 60,
                background: "#202c33",
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #222d34",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: "#6a7175", display: "flex",
                        alignItems: "center", justifyContent: "center",
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
                                maxWidth: "65%",
                                padding: "6px 10px 8px",
                                borderRadius: msg.isFromMe ? "8px 0 8px 8px" : "0 8px 8px 8px",
                                background: msg.isFromMe ? "#005c4b" : "#202c33",
                                color: "#e9edef",
                                fontSize: 14,
                                wordBreak: "break-word",
                                boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                            }}>
                                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                                <span style={{
                                    display: "block",
                                    textAlign: "right",
                                    fontSize: 11,
                                    color: "rgba(233,237,239,0.6)",
                                    marginTop: 4,
                                }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
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
                        padding: "9px 16px",
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
                    <Send size={22} />
                </button>
            </form>
        </div>
    );
}
