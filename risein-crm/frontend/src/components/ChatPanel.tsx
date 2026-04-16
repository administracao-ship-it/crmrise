"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, FileIcon, Smile, Mic, Check, CheckCheck, Trash2, Play, Square, Loader2, AlertCircle, Clock, MoreVertical, Search, Phone, Video } from "lucide-react";
import { fetchMessages, sendMessage as apiSendMessage, syncMessageMedia, API_URL } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Lead, Message } from "@/lib/api";
import toast from "react-hot-toast";

interface ChatPanelProps {
    lead: Lead | null;
    onClose: () => void;
    isFullScreen?: boolean;
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getInitials(name: string): string {
    if (!name) return "";
    return name
        .split(" ")
        .map((w) => w?.[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatDisplayName(text: string): string {
    if (!text) return "";
    return text.split('@')[0];
}

export default function ChatPanel({ lead, onClose, isFullScreen = false }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [syncingMedia, setSyncingMedia] = useState<Record<string, boolean>>({});
    const [sendError, setSendError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [showEmojis, setShowEmojis] = useState(false);
    const emojis = ["😀", "😂", "😍", "👍", "🙏", "🚀", "🔥", "✅", "⚠️", "❌", "📅", "📍", "💼", "💰", "📞", "🏠", "🌟", "✨", "🎉", "🤝"];
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addEmoji = (emoji: string) => {
        setInput(prev => prev + emoji);
        setShowEmojis(false);
    };

    useEffect(() => {
        if (!lead) return;

        fetchMessages(lead.id)
            .then(data => {
                setMessages(data);
                setSendError(null);
            })
            .catch(err => {
                console.error("Failed to fetch messages:", err);
                if (err.message?.includes("Lead not found")) {
                    setSendError("Contato não encontrado no servidor.");
                }
            });

        const socket = getSocket();

        const handleReceived = (data: Message & { lead: Lead }) => {
            if (data.leadId === lead.id) {
                setMessages((prev) => {
                    if (prev.find((m) => m.id === data.id)) return prev;
                    return [...prev, data];
                });
            }
        };

        const handleSent = (data: Message & { lead: Lead }) => {
            if (data.leadId === lead.id) {
                setMessages((prev) => {
                    if (prev.find((m) => m.id === data.id)) return prev;
                    return [...prev, data];
                });
            }
        };

        const handleStatusUpdate = (data: { messageId: string, status: string }) => {
            setMessages((prev) => 
                prev.map((m) => m.id === data.messageId ? { ...m, status: data.status } : m)
            );
        };

        socket.on("message:received", handleReceived);
        socket.on("message:sent", handleSent);
        socket.on("message:status", handleStatusUpdate);

        return () => {
            socket.off("message:received", handleReceived);
            socket.off("message:sent", handleSent);
            socket.off("message:status", handleStatusUpdate);
        };
    }, [lead]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !lead || sending) return;
        
        const content = input.trim();
        const tempId = `temp-${Date.now()}`;
        const tempMsg: Message = {
            id: tempId,
            content,
            type: "chat",
            status: "PENDING",
            isFromMe: true,
            timestamp: new Date().toISOString(),
            leadId: lead.id
        };

        setSending(true);
        setSendError(null);
        setMessages(prev => [...prev, tempMsg]);
        setInput("");

        try {
            const msg = await apiSendMessage(lead.id, content);
            setMessages((prev) => prev.map(m => m.id === tempId ? msg : m));
        } catch (err: any) {
            setSendError(err.message || "Falha ao enviar");
            setInput(content);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setSending(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setRecordedBlob(blob);
                setRecordedUrl(URL.createObjectURL(blob));
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
        } catch (err) {
            toast.error("Erro ao acessar microfone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
        setIsRecording(false);
    };

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    };

    const discardRecording = () => {
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(null);
        setRecordedUrl(null);
    };

    const handleAudioSend = async () => {
        if (!recordedBlob || !lead) return;
        const file = new File([recordedBlob], "recording.webm", { type: recordedBlob.type });
        const formData = new FormData();
        formData.append("file", file);
        
        setUploading(true);
        try {
            const msg = await apiSendMessage(lead.id, formData);
            setMessages(prev => [...prev, msg]);
            discardRecording();
        } catch (err) {
            toast.error("Falha ao enviar áudio");
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !lead) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const msg = await apiSendMessage(lead.id, formData);
            setMessages(prev => [...prev, msg]);
        } catch (err) {
            toast.error("Falha ao enviar arquivo");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadMedia = async (msgId: string) => {
        if (syncingMedia[msgId]) return;
        
        setSyncingMedia(prev => ({ ...prev, [msgId]: true }));
        try {
            await syncMessageMedia(msgId);
            // The UI will update via Socket.io automatically as syncMessageMedia emits message:received
        } catch (err) {
            toast.error("Erro ao baixar arquivo");
        } finally {
            setSyncingMedia(prev => ({ ...prev, [msgId]: false }));
        }
    };

    if (!lead) return <div className="chat-panel-empty">Selecione um contato para começar</div>;

    return (
        <div className="chat-panel h-full flex flex-col">
            {/* WhatsApp Styled Header */}
            <div className="chat-header h-[59px] bg-[#202c33] px-4 py-2 flex items-center justify-between border-b border-[#222d34]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {lead.avatarUrl ? (
                            <img src={lead.avatarUrl} alt={lead.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white font-bold">{getInitials(lead.name)}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[#e9edef] font-semibold text-[15px] leading-tight">
                            {formatDisplayName(lead.name)}
                        </span>
                        <span className="text-[#8696a0] text-[12px] leading-tight">
                            {lead.phone}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-[#aebac1]">
                    <Search size={20} className="cursor-pointer hover:text-white" />
                    <MoreVertical size={20} className="cursor-pointer hover:text-white" />
                    {onClose && (
                        <X size={20} className="ml-2 cursor-pointer hover:text-white" onClick={onClose} />
                    )}
                </div>
            </div>

            {/* Chat Messages Scrolling Area */}
            <div className="flex-1 relative overflow-hidden bg-[#0b141a]">
                <div className="chat-messages-bg opacity-[0.06] absolute inset-0 pointer-events-none" 
                     style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}>
                </div>
                
                <div className="chat-messages-content h-full overflow-y-auto relative z-1 p-5 flex flex-col gap-2">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`wa-bubble-wrapper ${msg.isFromMe ? 'sent' : 'received'}`}>
                            <div className={`wa-bubble ${msg.isFromMe ? 'sent' : 'received'}`}>
                                {msg.type === "audio" || msg.type === "ptt" ? (
                                    !msg.mediaUrl ? (
                                        <div className="flex items-center gap-3 p-2 bg-black/10 rounded-lg min-w-[200px]">
                                            <div onClick={() => handleDownloadMedia(msg.id)} className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center cursor-pointer hover:bg-[#008f70] transition">
                                                {syncingMedia[msg.id] ? <Loader2 size={18} className="animate-spin text-white" /> : <Play size={18} className="text-white fill-current ml-0.5" />}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <span className="text-xs text-[#8696a0] font-medium uppercase">Áudio do WhatsApp</span>
                                                <button onClick={() => handleDownloadMedia(msg.id)} disabled={syncingMedia[msg.id]} className="text-[13px] text-[#00a884] font-semibold text-left hover:underline">
                                                    Baixar para ouvir
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <audio controls className="max-w-full">
                                            <source src={`${API_URL}${msg.mediaUrl}`} type={msg.mimeType || "audio/ogg"} />
                                        </audio>
                                    )
                                ) : msg.type === "image" ? (
                                    !msg.mediaUrl ? (
                                        <div 
                                            onClick={() => handleDownloadMedia(msg.id)}
                                            className="wa-image-placeholder relative rounded-lg bg-[#2a3942] w-[280px] h-[200px] flex flex-col items-center justify-center cursor-pointer hover:bg-[#32444f] transition group overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                                            <div className="z-10 bg-black/40 p-3 rounded-full mb-3 group-hover:scale-110 transition">
                                                {syncingMedia[msg.id] ? <Loader2 size={24} className="animate-spin text-white" /> : <FileIcon size={24} className="text-white" />}
                                            </div>
                                            <span className="z-10 text-white font-medium text-sm">Baixar Foto</span>
                                            <span className="z-10 text-white/60 text-xs mt-1 uppercase">{msg.type}</span>
                                        </div>
                                    ) : (
                                        <img 
                                            src={`${API_URL}${msg.mediaUrl}`} 
                                            className="rounded-lg max-w-full cursor-pointer mb-1 w-[280px] object-cover" 
                                            onClick={() => window.open(`${API_URL}${msg.mediaUrl}`, '_blank')}
                                        />
                                    )
                                ) : msg.type === "video" ? (
                                    !msg.mediaUrl ? (
                                        <div 
                                            onClick={() => handleDownloadMedia(msg.id)}
                                            className="wa-video-placeholder relative rounded-lg bg-[#2a3942] w-[280px] h-[200px] flex flex-col items-center justify-center cursor-pointer hover:bg-[#32444f] transition group"
                                        >
                                            <div className="bg-black/40 p-3 rounded-full mb-2">
                                                {syncingMedia[msg.id] ? <Loader2 size={24} className="animate-spin text-white" /> : <Video size={24} className="text-white" />}
                                            </div>
                                            <span className="text-white font-medium text-sm">Baixar Vídeo</span>
                                        </div>
                                    ) : (
                                        <video controls className="rounded-lg max-w-full w-[280px]">
                                            <source src={`${API_URL}${msg.mediaUrl}`} type={msg.mimeType} />
                                        </video>
                                    )
                                ) : msg.type !== "chat" && msg.type !== "text" ? (
                                    // Other media types (document, etc)
                                    !msg.mediaUrl ? (
                                        <div 
                                            onClick={() => handleDownloadMedia(msg.id)}
                                            className="flex items-center gap-3 p-3 bg-black/10 rounded-lg min-w-[200px] cursor-pointer hover:bg-black/20 transition group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-[#3d4d56] flex items-center justify-center">
                                                {syncingMedia[msg.id] ? <Loader2 size={20} className="animate-spin text-white" /> : <FileIcon size={20} className="text-white" />}
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <span className="text-sm font-medium text-[#e9edef]">{msg.content || "Arquivo"}</span>
                                                <span className="text-xs text-[#00a884] font-bold uppercase mt-0.5">Clique para baixar • {msg.type}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <a href={`${API_URL}${msg.mediaUrl}`} target="_blank" className="flex items-center gap-2 p-2 bg-black/10 rounded mb-1">
                                            <FileIcon size={20} />
                                            <span className="text-sm truncate">{msg.content || "Arquivo"}</span>
                                        </a>
                                    )
                                ) : (
                                    <span className="text-[14.2px] whitespace-pre-wrap">{msg.content}</span>
                                )}
                                
                                <div className="wa-bubble-time">
                                    {formatTime(msg.timestamp)}
                                    {msg.isFromMe && (
                                        <span className={`wa-bubble-status ${msg.status === 'READ' ? 'read' : ''}`}>
                                            {msg.status === 'READ' ? <CheckCheck size={14} /> : 
                                             msg.status === 'DELIVERED' ? <CheckCheck size={14} /> : 
                                             msg.status === 'PENDING' ? <Clock size={12} /> : 
                                             <Check size={14} />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* WhatsApp Styled Input Area */}
            <div className="chat-input-area bg-[#202c33] px-4 py-2 flex items-center gap-3">
                <div className="flex items-center gap-2 text-[#aebac1]">
                    <button onClick={() => setShowEmojis(!showEmojis)} className="hover:text-white transition">
                        <Smile size={24} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="hover:text-white transition">
                        <Paperclip size={24} className={uploading ? "animate-pulse" : ""} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />
                </div>

                <div className="flex-1 relative">
                    {showEmojis && (
                        <div className="absolute bottom-full left-0 bg-[#233138] p-3 rounded-lg grid grid-cols-5 gap-2 mb-2 shadow-xl z-50 border border-white/5">
                            {emojis.map(e => (
                                <button key={e} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition">{e}</button>
                            ))}
                        </div>
                    )}

                    {isRecording ? (
                        <div className="bg-[#2a3942] rounded-full px-4 h-10 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-sm">{formatDuration(recordingTime)}</span>
                            </div>
                            <button onClick={stopRecording} className="text-red-500 font-bold text-xs uppercase hover:bg-white/5 px-2 py-1 rounded">Parar</button>
                        </div>
                    ) : recordedUrl ? (
                        <div className="bg-[#2a3942] rounded-full px-2 h-10 flex items-center gap-2 text-white">
                            <audio src={recordedUrl} controls className="h-8 flex-1" />
                            <button onClick={discardRecording} className="p-2 hover:bg-white/5 rounded-full"><Trash2 size={18} className="text-[#8696a0]" /></button>
                            <button onClick={handleAudioSend} className="p-2 bg-[#00a884] rounded-full"><Send size={18} /></button>
                        </div>
                    ) : (
                        <input
                            className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-4 py-2.5 text-[15px] focus:outline-none placeholder-[#8696a0]"
                            placeholder="Mensagem"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        />
                    )}
                </div>

                <div className="text-[#aebac1]">
                    {input.trim() || uploading || recordedUrl ? (
                        <button 
                            onClick={handleSend} 
                            disabled={sending || !input.trim()} 
                            className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white"
                        >
                            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    ) : (
                        <button 
                            onClick={startRecording} 
                            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition"
                        >
                            <Mic size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
