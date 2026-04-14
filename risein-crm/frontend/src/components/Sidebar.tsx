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

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Leads", active: true, href: "/" },
    { icon: MessageCircle, label: "Chats", href: "/" },
    { icon: CheckCircle, label: "Vendidos", href: "/" },
    { icon: XCircle, label: "Perdidos", href: "/" },
    { icon: UserMinus, label: "Não Leads", href: "/" },
    { icon: Send, label: "Disparos", href: "/" },
    { icon: BarChart3, label: "Métricas", href: "/" },
    { icon: Zap, label: "Automação", href: "/automation" },
];

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "light") {
            setIsLight(true);
            document.documentElement.classList.add("light-theme");
            document.documentElement.classList.remove("dark-theme");
        } else {
            setIsLight(false);
            document.documentElement.classList.remove("light-theme");
            document.documentElement.classList.add("dark-theme");
        }
    }, []);

    const toggleTheme = () => {
        const newVal = !isLight;
        setIsLight(newVal);
        if (newVal) {
            document.documentElement.classList.add("light-theme");
            document.documentElement.classList.remove("dark-theme");
            localStorage.setItem("theme", "light");
        } else {
            document.documentElement.classList.remove("light-theme");
            document.documentElement.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
        }
    };

    const handleLogout = () => {
        document.cookie = "auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">RI</div>
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
                        style={{ cursor: "pointer" }}
                    >
                        <item.icon size={20} />
                        <span className="sidebar-label">{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div
                    className="sidebar-item"
                    title={isLight ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
                    onClick={toggleTheme}
                    style={{ cursor: "pointer", color: isLight ? "var(--accent-orange)" : "var(--accent-blue)" }}
                >
                    {isLight ? <Moon size={20} /> : <Sun size={20} />}
                    <span className="sidebar-label">{isLight ? "Modo Escuro" : "Modo Claro"}</span>
                </div>
                <div
                    className={`sidebar-item ${activeTab === "Settings" ? "active" : ""}`}
                    title="Configurações"
                    onClick={() => onTabChange("Settings")}
                    style={{ cursor: "pointer" }}
                >
                    <Settings size={20} />
                    <span className="sidebar-label">Configurações</span>
                </div>
                <div
                    className="sidebar-item"
                    title="Sair"
                    onClick={handleLogout}
                    style={{ cursor: "pointer", color: "var(--accent-red)" }}
                >
                    <LogOut size={20} />
                    <span className="sidebar-label">Sair</span>
                </div>
            </div>
        </aside>
    );
}
