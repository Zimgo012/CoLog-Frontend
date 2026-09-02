import { apiFetch } from "./client";

export interface LoginResponse {
    id:        number
    token:     string
    email:     string
    username:  string
    firstName: string
    lastName:  string
}

// Login
export async function login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        throw new Error("Login failed");
    }

    return response.json();
}
