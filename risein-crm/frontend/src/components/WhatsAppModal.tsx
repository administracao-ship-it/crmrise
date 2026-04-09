"use client";

import React from "react";
import { X, Smartphone, CheckCircle2, AlertCircle, Loader2, Link2, LogOut } from "lucide-react";

interface WhatsAppModalProps {
    status: string;
    qrCode: string | null;
    onClose: () => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export default function WhatsAppModal({ status, qrCode, onClose, onConnect, onDisconnect }: WhatsAppModalProps) {
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [isDisconnecting, setIsDisconnecting] = React.useState(false);

    const handleConnect = async () => {
        if (onConnect) {
            setIsConnecting(true);
            await onConnect();
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (onDisconnect) {
            setIsDisconnecting(true);
            await onDisconnect();
            setIsDisconnecting(false);
            onClose();
        }
    };
    const getStatusDisplay = () => {
        switch (status) {
            case "connected":
                return {
                    icon: <CheckCircle2 className="text-green-500" size={48} />,
                    title: "Conectado!",
                    desc: "Seu WhatsApp está pronto para uso.",
                    color: "var(--accent-primary)",
                };
            case "waiting_qr":
                return {
                    icon: <Smartphone className="text-blue-500" size={48} />,
                    title: "Escaneie o QR Code",
                    desc: "Abra o WhatsApp > Aparelhos Conectados > Conectar um Aparelho.",
                    color: "var(--accent-secondary)",
                };
            case "authenticated":
                return {
                    icon: <Loader2 className="text-blue-500 animate-spin" size={48} />,
                    title: "Autenticando...",
                    desc: "Quase pronto! Sincronizando suas mensagens.",
                    color: "var(--accent-secondary)",
                };
            case "loading":
            case "initializing":
                return {
                    icon: <Loader2 className="text-blue-500 animate-spin" size={48} />,
                    title: "Iniciando...",
                    desc: "Preparando o navegador seguro no servidor...",
                    color: "var(--accent-secondary)",
                };
            default:
                return {
                    icon: <AlertCircle className="text-yellow-500" size={48} />,
                    title: "Desconectado",
                    desc: "Iniciando conexão com o WhatsApp...",
                    color: "var(--text-secondary)",
                };
        }
    };

    const display = getStatusDisplay();
    const qrUrl = qrCode && qrCode.startsWith("data:image") ? qrCode : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container"
                style={{ maxWidth: 400, textAlign: "center", padding: "40px 30px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
                    {display.icon}
                </div>

                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>
                    {display.title}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 30, lineHeight: 1.5 }}>
                    {display.desc}
                </p>

                {status === "waiting_qr" && qrUrl && (
                    <div style={{
                        background: "white",
                        padding: 15,
                        borderRadius: 12,
                        display: "inline-block",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                    }}>
                        <img
                            src={qrUrl}
                            alt="WhatsApp QR Code"
                            style={{ width: 220, height: 220, display: "block" }}
                        />
                    </div>
                )}

                {(status === "disconnected" || status === "") && !qrCode && (
                    <button
                        className="btn-primary"
                        style={{ width: "100%", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                        onClick={handleConnect}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Link2 size={20} />
                        )}
                        {isConnecting ? "Iniciando..." : "Conectar WhatsApp"}
                    </button>
                )}

                {status === "connected" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                        <button
                            className="btn-primary"
                            style={{ width: "100%" }}
                            onClick={onClose}
                        >
                            Fechar
                        </button>
                        <button
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            style={{
                                width: "100%",
                                padding: "10px 24px",
                                borderRadius: "4px",
                                fontSize: 11,
                                fontWeight: 900,
                                textTransform: "uppercase" as const,
                                letterSpacing: "1.2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                border: "1px solid var(--accent-red)",
                                background: "transparent",
                                color: "var(--accent-red)",
                                cursor: isDisconnecting ? "not-allowed" : "pointer",
                                opacity: isDisconnecting ? 0.6 : 1,
                                transition: "all 0.2s"
                            }}
                        >
                            {isDisconnecting ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                            {isDisconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
