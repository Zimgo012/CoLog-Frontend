import {createContext, useContext, useState, type ReactNode} from "react";
import {getToken, isTokenValid, logout as logoutUser} from "./auth";

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    login: (newToken: string) => void;
    logout: () => void;
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
    children
}: AuthProviderProps) {

    const [token, setToken] = useState<string | null>(() => {
        const storedToken = getToken();

        // No token
        if (!storedToken) {
            return null;
        }

        // Token exists but has expired/invalid
        if (!isTokenValid()) {
            logoutUser();
            return null;
        }

        return storedToken;
    });

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        logoutUser();
        setToken(null);
    };

    const isAuthenticated =
        token !== null && isTokenValid();

    return (
        <AuthContext.Provider
            value={{
                token,
                isAuthenticated,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used within an AuthProvider"
        );
    }

    return context;
}
