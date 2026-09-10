import { apiFetch, toApiError } from "./client";

export interface Document {
    documentId: number
    date: string
    yjsState: string | null
    revisions: any[]
}

export interface CreateDocumentPayload {
    /** ISO-8601 local date-time required by the document request DTO. */
    date: string
}

// GET /document/{diaryId}/all
export async function getDocuments(diaryId: number): Promise<Document[]> {
    const response = await apiFetch(`/document/${diaryId}/all`);

    if (!response.ok) {
        throw await toApiError(response, "Unable to load diary pages. Please try again.");
    }

    const data = await response.json();
    // Normalise: backend may return 'id' instead of 'documentId'
    return data.map((doc: any) => ({
        documentId: doc.documentId ?? doc.id,
        date:       doc.date,
        yjsState:   doc.yjsState ?? null,
        revisions:  doc.revisions ?? [],
    }));
}

// GET /document/{diaryId}/{documentId}
export async function getDocument(diaryId: number, documentId: number): Promise<Document> {
    const response = await apiFetch(`/document/${diaryId}/${documentId}`);

    if (!response.ok) {
        throw await toApiError(response, "Unable to load this document. Please try again.");
    }

    return response.json();
}

// CREATE document
export async function createDocument(body: CreateDocumentPayload, diaryId: number): Promise<Document> {
    const response = await apiFetch(`/document/${diaryId}/create`,{
        method : "POST",
        body : JSON.stringify(body),
    });
    if (!response.ok) {
        throw await toApiError(response, "Unable to create a new page. Please try again.");
    }

    const doc: any = await response.json();
    return {
        documentId: doc.documentId ?? doc.id,
        date:       doc.date,
        yjsState:   doc.yjsState ?? null,
        revisions:  doc.revisions ?? [],
    };
}
