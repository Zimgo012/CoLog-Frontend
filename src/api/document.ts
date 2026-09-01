import { apiFetch } from "./client";

export interface Document {
    documentId: number
    date: string
    yjsState: string | null
    revisions: any[]
}

// GET /document/{diaryId}/all
export async function getDocuments(diaryId: number): Promise<Document[]> {
    const response = await apiFetch(`/document/${diaryId}/all`);

    if (!response.ok) {
        throw new Error("Failed to fetch documents");
    }

    return response.json();
}

// GET /document/{diaryId}/{documentId}
export async function getDocument(diaryId: number, documentId: number): Promise<Document> {
    const response = await apiFetch(`/document/${diaryId}/${documentId}`);

    if (!response.ok) {
        throw new Error("Failed to fetch document");
    }

    return response.json();
}
