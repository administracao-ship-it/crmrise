"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Clock, Paperclip, Smile } from "lucide-react";
import { fetchMessages, sendMessage as apiSendMessage, API_URL } from "@/lib/api";
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

    useEffect(() => {
        if (!lead) return;
        setIsLoading(true);
        fetchMessages(lead.id)
            .then(data => {
                setMessages(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(() => {
                setMessages([]);
                setIsLoading(false);
            });
    }, [lead]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage("");

        try {
            await apiSendMessage(lead.phone, content);
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    if (!lead) return null;

    return (
        <div className="chat-panel flex flex-col h-full w-full bg-[#0b141a] overflow-hidden relative">
            {/* Header Simples */}
            <div className="chat-header h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-bold">
                        {lead.name?.charAt(0) || "U"}
                    </div>
                    <div>
                        <h3 className="text-[#e9edef] font-medium leading-tight">{lead.name}</h3>
                        <span className="text-[#8696a0] text-xs uppercase">{lead.phone}</span>
                    </div>
                </div>
            </div>

            {/* Area de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-[#0b141a]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-[#8696a0]">
                        Carregando mensagens...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#8696a0]">
                        Nenhuma mensagem encontrada.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`max-w-[70%] p-2 rounded-lg text-white ${msg.isFromMe ? "bg-[#005c4b] self-end" : "bg-[#202c33] self-start"}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-[10px] text-white/50 block text-right mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Simples */}
            <form onSubmit={handleSend} className="bg-[#202c33] p-3 flex items-center gap-3 border-t border-[#222d34] flex-shrink-0">
                <button type="button" className="text-[#8696a0] hover:text-[#d1d7db] transition">
                    <Paperclip size={24} />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mensagem"
                    className="flex-1 bg-[#2a3942] text-[#e9edef] px-4 py-2 rounded-lg focus:outline-none placeholder-[#8696a0]"
                />
                <button type="submit" className="text-[#8696a0] hover:text-[#d1d7db] transition">
                    <Send size={24} />
                </button>
            </form>
        </div>
    );
}
