import { apiFetch, toApiError } from "./client";

//fetch chat history
export async function getChatHistory(diaryId: number) {
    const response = await apiFetch(`/chat/${diaryId}`, {
        method: "GET",
    });

    if (!response.ok) {
        throw await toApiError(response, "Unable to load chat history. Please try again.");
    }

    return response.json();
}
