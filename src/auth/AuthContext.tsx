import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getToken, isTokenValid, logout as logoutUser } from "./auth";

interface AuthContextType {
    token:          string | null;
    isAuthenticated: boolean;
    isExpired:      boolean;       // true when a previously valid token has since expired
    login:          (newToken: string) => void;
    logout:         () => void;
    dismissExpired: () => void;    // clear the expired flag (e.g. after redirecting)
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

// How often to poll token validity while the tab is open (ms)
const CHECK_INTERVAL = 30_000;

export function AuthProvider({ children }: AuthProviderProps) {

    const [token, setToken] = useState<string | null>(() => {
        const storedToken = getToken();
        if (!storedToken)       return null;
        if (!isTokenValid())  { logoutUser(); return null; }
        return storedToken;
    });

    const [isExpired, setIsExpired] = useState(false);

    // Periodic check — fires the expired banner when the token silently expires
    useEffect(() => {
        if (!token) return;

        const id = setInterval(() => {
            if (!isTokenValid()) {
                logoutUser();       // remove from localStorage
                setToken(null);
                setIsExpired(true);
            }
        }, CHECK_INTERVAL);

        return () => clearInterval(id);
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setIsExpired(false);
    };

    const logout = () => {
        logoutUser();
        setToken(null);
        setIsExpired(false);
    };

    const dismissExpired = () => setIsExpired(false);

    const isAuthenticated = token !== null && isTokenValid();

    return (
        <AuthContext.Provider value={{
            token,
            isAuthenticated,
            isExpired,
            login,
            logout,
            dismissExpired,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
