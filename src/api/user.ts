import { apiFetch } from "./client";
import type { UserProfile } from "../auth/AuthContext";

export interface UpdateUserPayload {
    email?:     string
    firstName?: string
    lastName?:  string
    password?:  string
}

// PATCH /user/{id} — update the current user's profile
export async function updateUser(id: number, payload: UpdateUserPayload): Promise<UserProfile> {
    const response = await apiFetch(`/user/edit/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error("Failed to update profile");
    }

    return response.json();
}


// Get if user exist
export async function checkIfUsernameExists(username: string): Promise<boolean> {
    const response = await apiFetch(`/user/check/${username}`, {
        method: "GET"
    })

    if (!response.ok) {
        throw new Error("Failed to check username exists");
    }

    return response.json();
}
