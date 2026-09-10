import { apiFetch, toApiError } from "./client";

// Register user      /auth/register

// Body :
// {
//     firstName,
//     lastName,
//     username,
//     email,
//     password
// }

// Returns {String email};



//Verify user /auth/verify

// Body :
// {
//     email,
//     code,
// }

// Returns
//{
//      String firstName;
//     String lastName;
//     String email;
// }

export interface RegisterPayload {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
}

export interface RegisterResponse { email: string; }

export interface VerifyResponse {
    firstName: string;
    lastName: string;
    email: string;
}

/** Starts registration and sends a verification code to the supplied email. */
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
    const response = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    if (!response.ok) throw await toApiError(response, "Unable to create your account. Please try again.");
    return response.json();
}

/** Confirms the emailed registration code. */
export async function verify(email: string, code: string): Promise<VerifyResponse> {
    const response = await apiFetch("/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
    if (!response.ok) throw await toApiError(response, "Unable to verify that code. Please try again.");
    return response.json();
}
