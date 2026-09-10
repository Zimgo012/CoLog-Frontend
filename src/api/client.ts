const apiUrl = import.meta.env.VITE_API_URL;

export interface ApiErrorPayload {
    status: number
    code: string
    message: string
}

/** An error returned by the API. Use `code` for behaviour and `message` in the UI. */
export class ApiError extends Error {
    readonly status: number
    readonly code: string

    constructor({ status, code, message }: ApiErrorPayload) {
        super(message)
        this.name = "ApiError"
        this.status = status
        this.code = code
    }
}

const FALLBACK_MESSAGE = "Something went wrong. Please try again."

/** Parses the API's standard error body without relying on message text for logic. */
export async function toApiError(response: Response, fallback = FALLBACK_MESSAGE): Promise<ApiError> {
    let body: Partial<ApiErrorPayload> | null = null

    try {
        const parsed: unknown = await response.json()
        if (parsed && typeof parsed === "object") body = parsed as Partial<ApiErrorPayload>
    } catch {
        // A proxy or an older endpoint may not return JSON.
    }

    const error = new ApiError({
        status: typeof body?.status === "number" ? body.status : response.status,
        code: typeof body?.code === "string" ? body.code : "HTTP_ERROR",
        message: typeof body?.message === "string" && body.message.trim() ? body.message : fallback,
    })

    if (error.code === "INVALID_JWT" || error.code === "AUTHENTICATION_REQUIRED") {
        window.dispatchEvent(new CustomEvent("colog:authentication-error", { detail: error }))
    }

    return error
}

export function errorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
    return error instanceof Error && error.message ? error.message : fallback
}

export async function apiFetch(
    path: string,
    options: RequestInit = {}
) {
    const token = localStorage.getItem("token");

    return fetch(`${apiUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
        },
    });
}
