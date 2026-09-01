const apiUrl = import.meta.env.VITE_API_URL;

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