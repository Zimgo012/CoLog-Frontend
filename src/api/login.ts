import { apiFetch } from "./client";


// Login
export async function login(username: File | string | null, password: File | string | null) {
    const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            username,
            password,
        }),
    });

    if (!response.ok) {
        // Add component her
        throw new Error("Login failed");
    }
    const data = await response.json();

    return data.token;
}

