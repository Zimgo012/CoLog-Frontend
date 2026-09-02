import { apiFetch } from "./client";

//fetch chat history
export async function getChatHistory(diaryId: number) {
    const response = await apiFetch(`/chat/${diaryId}`, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error(`Failed to create diary: ${response.status}`);
    }

    return response.json();
}