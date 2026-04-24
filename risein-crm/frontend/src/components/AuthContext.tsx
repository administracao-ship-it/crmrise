"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, fetchCurrentUser } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const checkUser = async () => {
        const token = localStorage.getItem("auth-token");
        if (!token) {
            setLoading(false);
            if (pathname !== "/login") router.push("/login");
            return;
        }

        try {
            const userData = await fetchCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error("Auth error:", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem("auth-token", token);
        // Set cookie for middleware
        document.cookie = `auth-session=active; path=/; max-age=86400; SameSite=Strict`;
        setUser(userData);
        router.push("/");
    };

    const logout = () => {
        localStorage.removeItem("auth-token");
        document.cookie = "auth-session=; path=/; max-age=0";
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            login, 
            logout, 
            isAdmin: user?.role === "ADMIN" 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
