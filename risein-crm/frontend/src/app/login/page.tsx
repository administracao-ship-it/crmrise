"use client";

import { useState } from "react";
import { Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Simulação de login (rise / leadqualificado)
        if (login === "rise" && password === "leadqualificado") {
            // Em um app real, aqui faríamos uma chamada para uma API Route que seta o cookie
            // Para simplicidade e eficácia imediata neste ambiente:
            document.cookie = "auth-session=active; path=/; max-age=86400; SameSite=Strict";
            window.location.href = "/";
        } else {
            setError("Credenciais inválidas. Tente novamente.");
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">RI</div>
                    <h1>CRM RISE IN</h1>
                    <p>Acesse o ecossistema de gestão de leads</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group-premium">
                        <label>Login</label>
                        <div className="input-with-icon">
                            <User size={18} />
                            <input 
                                type="text" 
                                placeholder="Seu usuário" 
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group-premium">
                        <label>Senha</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input 
                                type="password" 
                                placeholder="Sua senha" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="btn-primary login-submit" disabled={loading}>
                        {loading ? "AUTHENTICATING..." : "ACESSAR CRM"}
                        <ArrowRight size={16} />
                    </button>
                </form>

                <div className="login-footer">
                    <ShieldCheck size={14} />
                    <span>Conexão segura e criptografada</span>
                </div>
            </div>

            <div className="login-bg-decoration">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>
        </div>
    );
}
