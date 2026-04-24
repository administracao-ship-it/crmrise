"use client";

import { useState } from "react";
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { login as apiLogin } from "@/lib/api";
import { useAuth } from "@/components/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { token, user } = await apiLogin(email, password);
            login(token, user);
            toast.success(`Bem-vindo, ${user.name}!`);
        } catch (err: any) {
            toast.error(err.message || "Erro ao fazer login. Verifique suas credenciais.");
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
                        <label>Usuário ou E-mail</label>
                        <div className="input-with-icon">
                            <Mail size={18} />
                            <input 
                                type="text" 
                                placeholder="rise ou seu e-mail" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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

                    <button type="submit" className="btn-primary login-submit" disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : "ACESSAR CRM"}
                        {!loading && <ArrowRight size={16} />}
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
