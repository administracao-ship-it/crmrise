"use client";

import { Search, Plus, Wifi, WifiOff, Pencil, Check, X, LogOut, Bot, BotOff, Filter, Calendar, Tag as TagIcon, MapPin, Layers } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Tag, Stage } from "@/lib/api";

interface FilterState {
    startDate: string;
    endDate: string;
    tagIds: string[];
    city: string;
    stageId: string;
}

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
    onLogout: () => void;
    isAiActive: boolean;
    onAiToggle: () => void;
    activeTab: string;
    filters: FilterState;
    onFiltersChange: (f: FilterState) => void;
    allTags: Tag[];
    stages: Stage[];
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
    onLogout,
    isAiActive,
    onAiToggle,
    activeTab,
    filters,
    onFiltersChange,
    allTags,
    stages,
}: HeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [editValue, setEditValue] = useState(funnelName);
    const inputRef = useRef<HTMLInputElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilters(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const clearFilters = () => {
        onFiltersChange({
            startDate: "",
            endDate: "",
            tagIds: [],
            city: "",
            stageId: ""
        });
        onSearchChange("");
    };

    const hasActiveFilters = filters.startDate || filters.endDate || filters.tagIds.length > 0 || filters.city || filters.stageId || searchQuery;

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
                {activeTab === "Leads" && (
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
                )}
            </div>

            {activeTab !== "Dashboard" && (
                <div className="header-search-container" ref={filterRef}>
                    <div 
                        className={`header-search ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
                        onClick={(e) => {
                            console.log("Search container clicked, current showFilters:", showFilters);
                            setShowFilters(!showFilters);
                        }}
                    >
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="Busca e filtro"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onFocus={() => {
                                console.log("Input focused, showing filters");
                                setShowFilters(true);
                            }}
                        />
                        <Filter size={14} className="filter-icon" />
                    </div>

                    {showFilters && (
                        <div className="filter-dropdown">
                            <div className="filter-header">
                                <h3>Filtros Avançados</h3>
                                <button onClick={clearFilters} className="btn-clear-filters">Limpar</button>
                            </div>

                            <div className="filter-section">
                                <label><Calendar size={12} /> Período</label>
                                <div className="filter-row">
                                    <input 
                                        type="date" 
                                        value={filters.startDate} 
                                        onChange={(e) => onFiltersChange({...filters, startDate: e.target.value})}
                                    />
                                    <span>até</span>
                                    <input 
                                        type="date" 
                                        value={filters.endDate} 
                                        onChange={(e) => onFiltersChange({...filters, endDate: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="filter-section">
                                <label><TagIcon size={12} /> Tags</label>
                                <div className="filter-tags-grid">
                                    {allTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            className={`filter-tag-pill ${filters.tagIds.includes(tag.id) ? 'active' : ''}`}
                                            onClick={() => {
                                                const newTags = filters.tagIds.includes(tag.id)
                                                    ? filters.tagIds.filter(id => id !== tag.id)
                                                    : [...filters.tagIds, tag.id];
                                                onFiltersChange({...filters, tagIds: newTags});
                                            }}
                                            style={{ '--tag-color': tag.color } as any}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-row-grid">
                                <div className="filter-section">
                                    <label><MapPin size={12} /> Cidade</label>
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar por cidade"
                                        value={filters.city}
                                        onChange={(e) => onFiltersChange({...filters, city: e.target.value})}
                                    />
                                </div>
                                <div className="filter-section">
                                    <label><Layers size={12} /> Etapa</label>
                                    <select 
                                        value={filters.stageId}
                                        onChange={(e) => onFiltersChange({...filters, stageId: e.target.value})}
                                    >
                                        <option value="">Todas as etapas</option>
                                        {stages.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="header-stats">
              <span className="leads-summary">
                {totalLeads} leads: <strong>{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
              </span>
            </div>

            <div className="header-actions">
                <button className="btn-primary" onClick={onNewLead}>
                    <Plus size={14} />
                    + NOVO LEAD
                </button>

                <div 
                    className={`ai-status-icon ${isAiActive ? 'active' : 'inactive'}`}
                    onClick={onAiToggle}
                    title={isAiActive ? "Desativar IA Global" : "Ativar IA Global"}
                >
                    {isAiActive ? <Bot size={14} /> : <BotOff size={14} />}
                </div>

                <div
                    className={`whatsapp-status-icon ${whatsappStatus === 'connected' || whatsappStatus === 'authenticated' ? 'connected' : whatsappStatus === 'waiting_qr' || whatsappStatus === 'initializing' || whatsappStatus === 'loading' ? 'waiting' : 'disconnected'}`}
                    onClick={onStatusClick}
                    title={`WhatsApp: ${whatsappStatus}`}
                >
                    {whatsappStatus === 'connected' || whatsappStatus === 'authenticated' ? <Wifi size={14} /> : <WifiOff size={14} />}
                </div>

                <div
                    className="whatsapp-status-icon logout"
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
