"use client";

import { Search, Plus, Wifi, WifiOff, Pencil, Check, X, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
    totalLeads: number;
    totalValue: number;
    whatsappStatus: string;
    onNewLead: () => void;
    onStatusClick: () => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    viewMode: "kanban" | "list";
    onViewChange: (mode: "kanban" | "list") => void;
    funnelName: string;
    onUpdateFunnelName: (name: string) => void;
    onOpenSettings?: () => void;
    onLogout: () => void;
}

export default function Header({
    totalLeads,
    totalValue,
    whatsappStatus,
    onNewLead,
    onStatusClick,
    searchQuery,
    onSearchChange,
    viewMode,
    onViewChange,
    funnelName,
    onUpdateFunnelName,
    onOpenSettings,
    onLogout,
}: HeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(funnelName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditValue(funnelName);
    }, [funnelName]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editValue.trim() && editValue !== funnelName) {
            onUpdateFunnelName(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(funnelName);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") handleCancel();
    };
    const statusClass =
        whatsappStatus === "connected" || whatsappStatus === "authenticated"
            ? "connected"
            : (whatsappStatus === "waiting_qr" || whatsappStatus === "initializing" || whatsappStatus === "loading")
                ? "waiting"
                : "disconnected";

    const statusLabel =
        whatsappStatus === "connected" || whatsappStatus === "authenticated"
            ? "WhatsApp Conectado"
            : whatsappStatus === "waiting_qr"
                ? "Aguardando QR Code"
                : (whatsappStatus === "initializing" || whatsappStatus === "loading")
                    ? "Iniciando Conexão..."
                    : "WhatsApp Desconectado";

    return (
        <header className="header">
            <div className="header-title">
                {isEditing ? (
                    <div className="funnel-name-edit">
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSave}
                            className="funnel-name-input"
                        />
                        <button onClick={handleSave} className="btn-icon-save" title="Salvar">
                            <Check size={14} />
                        </button>
                        <button onClick={handleCancel} className="btn-icon-cancel" title="Cancelar">
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="funnel-name-display">
                        <span onClick={() => setIsEditing(true)}>{funnelName}</span>
                        <button 
                            className="btn-edit-funnel" 
                            onClick={() => setIsEditing(true)}
                            title="Editar nome do funil"
                        >
                            <Pencil size={12} />
                        </button>
                    </div>
                )}
                <div className="view-toggle">
                  <button 
                    className={viewMode === 'list' ? 'active' : ''} 
                    onClick={() => onViewChange('list')}
                  >
                    Leads ativos
                  </button>
                  <button 
                    className={viewMode === 'kanban' ? 'active' : ''} 
                    onClick={() => onViewChange('kanban')}
                  >
                    Kanban
                  </button>
                </div>
            </div>

            <div className="header-search">
                <Search size={14} />
                <input
                    type="text"
                    placeholder="Busca e filtro"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <div className="header-stats">
              <span className="leads-summary">
                {totalLeads} leads: <strong>{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
              </span>
            </div>

            <div className="header-actions">
                <button className="btn-automate" onClick={onOpenSettings}>
                  <div className="bolt-icon">⚡</div>
                  AUTOMATIZE
                </button>
                
                <button className="btn-primary" onClick={onNewLead}>
                    <Plus size={14} />
                    + NOVO LEAD
                </button>

                <div
                    className={`whatsapp-status-icon ${statusClass}`}
                    onClick={onStatusClick}
                    title={statusLabel}
                >
                    {whatsappStatus === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
                </div>

                <div
                    className="whatsapp-status-icon disconnected"
                    onClick={onLogout}
                    title="Sair do CRM"
                    style={{ marginLeft: '4px' }}
                >
                    <LogOut size={14} />
                </div>
            </div>
        </header>
    );
}
