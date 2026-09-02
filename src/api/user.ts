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
