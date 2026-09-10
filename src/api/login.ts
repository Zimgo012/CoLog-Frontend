import { apiFetch, toApiError } from "./client";

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
        throw await toApiError(response, "Unable to log in. Please try again.");
    }

    return response.json();
}
