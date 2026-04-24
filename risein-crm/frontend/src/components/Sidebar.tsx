"use client";

import {
    Home,
    Users,
    DollarSign,
    MessageCircle,
    Calendar,
    Contact,
    Bot,
    Mail,
    Settings,
    Sun,
    Moon,
    LogOut,
    Zap,
    Plus,
    Lightbulb,
    Send,
    BarChart3,
    CheckCircle,
    XCircle,
    UserMinus,
    LayoutDashboard
} from "lucide-react";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Leads", active: true, href: "/" },
    { icon: MessageCircle, label: "Chats", href: "/" },
    { icon: CheckCircle, label: "Vendidos", href: "/" },
    { icon: XCircle, label: "Perdidos", href: "/" },
    { icon: UserMinus, label: "Não Leads", href: "/" },
    { icon: Send, label: "Disparos", href: "/" },
    { icon: BarChart3, label: "Métricas", href: "/" },
    { icon: Lightbulb, label: "Melhorias", href: "/" },
];

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="w-8 h-8 bg-wa-green rounded-full flex items-center justify-center">
                    <Zap size={18} fill="#D4145A" color="#0b141a" />
                </div>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={(e) => {
                            if (item.href === "/") {
                                e.preventDefault();
                                onTabChange(item.label);
                            }
                        }}
                        className={`sidebar-item ${activeTab === item.label ? "active" : ""}`}
                        title={item.label}
                    >
                        <item.icon size={22} strokeWidth={activeTab === item.label ? 2.5 : 2} />
                        <span className="sidebar-label">{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div
                    className={`sidebar-item ${activeTab === "Settings" ? "active" : ""}`}
                    title="Configurações"
                    onClick={() => onTabChange("Settings")}
                >
                    <Settings size={22} />
                    <span className="sidebar-label">Configurações</span>
                </div>
                <div
                    className="sidebar-item"
                    title="Sair"
                    onClick={handleLogout}
                    style={{ color: "#ef4444" }}
                >
                    <LogOut size={22} />
                    <span className="sidebar-label">Sair</span>
                </div>

                {user && (
                    <div style={{ 
                        marginTop: "12px", 
                        padding: "12px 0", 
                        borderTop: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px"
                    }}>
                        <div style={{ 
                            width: "32px", 
                            height: "32px", 
                            borderRadius: "50%", 
                            background: "var(--accent-blue)", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "white"
                        }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ 
                            fontSize: "0.65rem", 
                            color: "var(--text-secondary)", 
                            fontWeight: 600,
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                        }}>
                            {user.role}
                        </span>
                    </div>
                )}
            </div>
        </aside>
    );
}
