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
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Sincroniza o estado inicial com a classe já presente no HTML (evita flicker e inconsistência)
        const hasDarkClass = document.documentElement.classList.contains("dark-theme");
        setIsDarkMode(hasDarkClass);
        
        // Também verifica o localStorage caso a classe não tenha sido aplicada ainda
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark" && !hasDarkClass) {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark-theme");
        }
    }, []);

    const toggleTheme = () => {
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        
        if (nextMode) {
            document.documentElement.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark-theme");
            localStorage.setItem("theme", "light");
        }
        
        // Dispara um evento customizado para outros componentes que possam estar ouvindo (opcional)
        window.dispatchEvent(new Event('themechange'));
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <aside className="sidebar">
                <div className="sidebar-logo">
                    <Zap size={18} fill="white" color="white" />
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
                    className="sidebar-item"
                    title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
                    onClick={toggleTheme}
                >
                    {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
                    <span className="sidebar-label">{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
                </div>
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
                            background: "var(--accent-navy)", 
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
