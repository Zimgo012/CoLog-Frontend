import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getToken, isTokenValid, logout as logoutUser } from "./auth";
import type { LoginResponse } from "../api/login";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserProfile = Omit<LoginResponse, "token">;

interface AuthContextType {
    token:           string | null;
    user:            UserProfile | null;
    isAuthenticated: boolean;
    isExpired:       boolean;
    login:           (response: LoginResponse) => void;
    logout:          () => void;
    updateUser:      (partial: Partial<UserProfile>) => void;
    dismissExpired:  () => void;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const TOKEN_KEY   = "token";
const PROFILE_KEY = "user_profile";

function loadProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
        return null;
    }
}

// How often to poll token validity while the tab is open (ms)
const CHECK_INTERVAL = 30_000;

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {

    const [token, setToken] = useState<string | null>(() => {
        const stored = getToken();
        if (!stored)         return null;
        if (!isTokenValid()) { logoutUser(); return null; }
        return stored;
    });

    const [user, setUser] = useState<UserProfile | null>(() => loadProfile());

    const [isExpired, setIsExpired] = useState(false);

    // Periodic expiry check
    useEffect(() => {
        if (!token) return;
        const id = setInterval(() => {
            if (!isTokenValid()) {
                logoutUser();
                setToken(null);
                setIsExpired(true);
            }
        }, CHECK_INTERVAL);
        return () => clearInterval(id);
    }, [token]);

    // The server is authoritative too: a token can be revoked before its JWT expiry.
    useEffect(() => {
        const handleAuthenticationError = () => {
            logoutUser();
            localStorage.removeItem(PROFILE_KEY);
            setToken(null);
            setUser(null);
            setIsExpired(true);
        };
        window.addEventListener("colog:authentication-error", handleAuthenticationError);
        return () => window.removeEventListener("colog:authentication-error", handleAuthenticationError);
    }, []);

    const login = (response: LoginResponse) => {
        const { token: newToken, ...profile } = response;
        localStorage.setItem(TOKEN_KEY,   newToken);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        setToken(newToken);
        setUser(profile);
        setIsExpired(false);
    };

    const logout = () => {
        logoutUser();
        localStorage.removeItem(PROFILE_KEY);
        setToken(null);
        setUser(null);
        setIsExpired(false);
    };

    // Merge partial updates into the stored profile (used after PATCH /user)
    const updateUser = (partial: Partial<UserProfile>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...partial };
            localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const dismissExpired = () => setIsExpired(false);

    const isAuthenticated = token !== null && isTokenValid();

    return (
        <AuthContext.Provider value={{
            token,
            user,
            isAuthenticated,
            isExpired,
            login,
            logout,
            updateUser,
            dismissExpired,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
