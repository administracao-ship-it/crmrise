"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, FileIcon, Smile, Mic, Check, CheckCheck, Trash2, Play, Square, Loader2, AlertCircle, Clock } from "lucide-react";
import { fetchMessages, sendMessage as apiSendMessage, API_URL } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Lead, Message } from "@/lib/api";

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
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function ChatPanel({ lead, onClose, isFullScreen = false }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
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
                    setSendError("Este contato não foi encontrado no servidor. Por favor, atualize a lista (F5).");
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
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
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
        
        // Optimistic update
        setMessages(prev => [...prev, tempMsg]);
        setInput("");

        try {
            const msg = await apiSendMessage(lead.id, content);
            setMessages((prev) => {
                // Replace temp message with real one from server
                return prev.map(m => m.id === tempId ? msg : m);
            });
        } catch (err: any) {
            console.error("Failed to send message:", err);
            setSendError(err.message || "Falha ao enviar mensagem");
            // Highlight the failed message or keep the text in input if preferred.
            // For now, let's keep the message in list but mark as error or return to input.
            setInput(content); // Return text to input for retry
            setMessages(prev => prev.filter(m => m.id !== tempId)); // Remove temp message
        } finally {
            setSending(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            let mimeType = 'audio/ogg; codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm; codecs=opus';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ''; // Let the browser decide if all fail
            }

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const mimeType = recorder.mimeType;
                const blob = new Blob(chunks, { type: mimeType });
                
                if (blob.size < 100) {
                    console.warn("Recording too small, might be silent or failed.");
                }
                
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
            console.error("Microphone access denied:", err);
            alert("Permissão de microfone negada ou erro ao acessar.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        setIsRecording(false);
    };

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const discardRecording = () => {
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(null);
        setRecordedUrl(null);
    };

    const handleAudioSend = async () => {
        if (!recordedBlob || !lead) return;
        
        if (recordedBlob.size < 500) {
            alert("O áudio parece estar vazio ou é muito curto. Tente gravar novamente.");
            return;
        }

        const extension = recordedBlob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([recordedBlob], `recording.${extension}`, { type: recordedBlob.type });
        const formData = new FormData();
        formData.append("file", file);
        
        setUploading(true);
        try {
            const msg = await apiSendMessage(lead.id, formData);
            setMessages((prev) => {
                if (prev.find((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            discardRecording();
        } catch (err) {
            console.error("Failed to send recording:", err);
            alert("Falha ao enviar áudio. Verifique sua conexão ou se o WhatsApp está pronto.");
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
            setMessages((prev) => {
                if (prev.find((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        } catch (err) {
            console.error("Failed to upload file:", err);
            alert("Falha ao enviar arquivo.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`chat-panel ${lead ? "open" : ""} ${isFullScreen ? "full-screen" : ""}`}>
            {lead && (
                <>
                    <div className="chat-header">
                        <div className="chat-contact">
                            <div className="chat-contact-avatar">
                                {getInitials(lead.name)}
                            </div>
                            <div>
                                <div className="chat-contact-name">{lead.name}</div>
                                <div className="chat-contact-phone">{lead.phone}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {!isFullScreen && (
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.05)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "var(--radius-sm)",
                                        color: "var(--text-secondary)",
                                        cursor: "pointer",
                                        width: "32px",
                                        height: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "all 0.2s"
                                    }}
                                    className="hover:bg-red-500 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-view-empty">
                                <span>Comece uma conversa agora</span>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const hasContent = msg.content || msg.mediaUrl;
                                if (!hasContent) return null;

                                return (
                                    <div key={msg.id} className={`message-wrapper ${msg.isFromMe ? "sent" : "received"}`}>
                                        <div className={`message-bubble ${msg.type === 'image' ? 'has-image' : ''}`}>
                                            {msg.type === "audio" && msg.mediaUrl ? (
                                                <audio
                                                    controls
                                                    className="chat-audio-player"
                                                >
                                                    <source
                                                        src={`${API_URL}${msg.mediaUrl}`}
                                                        type={msg.mimeType || "audio/ogg"}
                                                    />
                                                </audio>
                                            ) : msg.type === "image" && msg.mediaUrl ? (
                                                <div className="chat-image-container">
                                                    <img 
                                                        src={`${API_URL}${msg.mediaUrl}`} 
                                                        alt="Imagem" 
                                                        className="chat-image"
                                                        onClick={() => window.open(`${API_URL}${msg.mediaUrl}`, '_blank')}
                                                    />
                                                </div>
                                            ) : msg.mediaUrl ? (
                                                <div className="chat-file-container">
                                                    <a 
                                                        href={`${API_URL}${msg.mediaUrl}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="chat-file-link"
                                                    >
                                                        <FileIcon size={20} />
                                                        <span>{msg.content || "Arquivo"}</span>
                                                    </a>
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                            <div className="message-time">
                                                {formatTime(msg.timestamp)}
                                                {msg.isFromMe && (
                                                    <span style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center' }}>
                                                        {msg.status === "READ" ? (
                                                            <CheckCheck size={12} color="#34b7f1" />
                                                        ) : msg.status === "DELIVERED" ? (
                                                            <CheckCheck size={12} />
                                                        ) : msg.status === "PENDING" ? (
                                                            <Clock size={10} className="animate-pulse" />
                                                        ) : (
                                                            <Check size={12} />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={scrollRef} />
                    </div>

                    <div className="chat-input-area">
                        <div className="chat-input-wrapper">
                        {showEmojis && (
                            <div className="emoji-picker-mini">
                                {emojis.map(e => (
                                    <button key={e} onClick={() => addEmoji(e)} className="emoji-btn">
                                        {e}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                            accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,audio/*"
                        />
                        <div className="chat-input-actions-left">
                            <button
                                className="chat-attach-btn"
                                onClick={() => setShowEmojis(!showEmojis)}
                                title="Emojis"
                            >
                                <Smile size={20} />
                            </button>
                            <button
                                className="chat-attach-btn"
                                onClick={triggerFileSelect}
                                disabled={uploading}
                                title="Anexar arquivo"
                            >
                                <Paperclip size={20} />
                            </button>
                        </div>

                        {isRecording ? (
                            <div className="chat-recording-indicator" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="recording-dot"></div>
                                <span>Gravando {formatDuration(recordingTime)}</span>
                                <button onClick={stopRecording} className="stop-btn">
                                    <Square size={12} fill="currentColor" /> Parar
                                </button>
                            </div>
                        ) : recordedUrl ? (
                            <div className="chat-audio-review" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <audio src={recordedUrl} controls className="mini-audio-preview" style={{ flex: 1 }} />
                                <button onClick={discardRecording} className="discard-btn" title="Excluir">
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={handleAudioSend} className="send-recorded-btn" disabled={uploading}>
                                    <Send size={18} />
                                </button>
                            </div>
                        ) : (
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="text"
                                        className={`chat-input-field ${sendError ? 'border-red-500' : ''}`}
                                        placeholder={sending ? "Enviando..." : "Pressione Enter para enviar..."}
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                            if (sendError) setSendError(null);
                                        }}
                                        disabled={sending}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                    />
                                    {sendError && (
                                        <div className="absolute -top-8 left-0 text-red-500 text-[10px] flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                                            <AlertCircle size={10} /> {sendError}
                                        </div>
                                    )}
                                </div>
                        )}
                        
                        <div className="chat-input-actions-right">
                            {(input.trim() || uploading) && !isRecording && !recordedUrl ? (
                                <button className="chat-send-btn" onClick={handleSend} disabled={sending || !input.trim()}>
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            ) : !isRecording && !recordedUrl ? (
                                <button 
                                    onClick={startRecording} 
                                    className="chat-mic-btn"
                                    title="Gravar áudio"
                                >
                                    <Mic size={20} />
                                </button>
                            ) : null}
                        </div>
                      </div>
                    </div>
                </>
            )}
        </div>
    );
}
