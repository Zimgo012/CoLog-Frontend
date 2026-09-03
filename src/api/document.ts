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
        throw new Error("Failed to fetch document");
    }

    return response.json();
}

// CREATE document
export async function createDocument(body : object, diaryId : number): Promise<Document> {
    const response = await apiFetch(`/document/${diaryId}/create`,{
        method : "POST",
        body : JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error("Failed to create document");
    }

    const doc: any = await response.json();
    return {
        documentId: doc.documentId ?? doc.id,
        date:       doc.date,
        yjsState:   doc.yjsState ?? null,
        revisions:  doc.revisions ?? [],
    };
}


