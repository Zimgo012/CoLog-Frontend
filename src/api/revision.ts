import { apiFetch, toApiError } from "./client";

export interface Revision {
    revisionId: number;
    createdAt: string;
    yjsState: string | number[] | Record<string, number> | null;
    label?: string | null;
    createdBy?: string | null;
}

function normaliseRevision(value: any): Revision {
    return {
        revisionId: Number(value.revisionId ?? value.id),
        createdAt: value.saveDate ?? value.createdAt ?? value.date ?? value.savedAt ?? value.timestamp ?? "",
        yjsState: value.yjsUpdate ?? value.yjsState ?? value.yjs ?? value.content ?? null,
        label: value.label ?? value.name ?? null,
        createdBy: value.createdBy ?? value.authorName ?? value.userName ?? null,
    };
}

// POST /document/{documentId}/revisions/save
// response :
export async function saveRevision(documentId: number, yjsUpdate: Uint8Array): Promise<Revision> {
    // Copy so the request contains precisely this update's bytes, even if it
    // originated from a typed-array view over a larger buffer.
    const rawUpdate = yjsUpdate.slice();
    const response = await apiFetch(`/document/${documentId}/revision/save`, {
        method: "POST",
        // The backend receives the untouched bytes produced by
        // Y.encodeStateAsUpdate(), rather than a JSON/base64 intermediary.
        headers: { "Content-Type": "application/octet-stream" },
        body: rawUpdate.buffer as ArrayBuffer,
    });
    if (!response.ok) {
        throw await toApiError(response, "Unable to save a snapshot. Please try again.");
    }

    return normaliseRevision(await response.json());
}

// GET /document/{documentId}/revisions/
// response:    [
//     {
//         "id": 1,
//         "yjsUpdate": "AQMEBQY=",
//         "saveDate": "2026-09-15T17:18:52.076734"
//     },
//     {
//         "id": 2,
//         "yjsUpdate": null,
//         "saveDate": "2026-09-15T17:19:09.588929"
//     }
// ]
export async function getRevisions(documentId: number): Promise<Revision[]> {
    const response = await apiFetch(`/document/${documentId}/revisions`);
    if (!response.ok) {
        throw await toApiError(response, "Unable to load revision history. Please try again.");
    }

    const data = await response.json();
    const revisions = Array.isArray(data) ? data : (data.revisions ?? data.content ?? []);
    return revisions.map(normaliseRevision);
}

// GET /document/{documentId}/revisions/{revisionId}
// response:
// {
//     "id": 2,
//     "yjsUpdate": null,
//     "saveDate": "2026-09-15T17:19:09.588929"
// }
export async function getRevision(documentId: number, revisionId: number): Promise<Revision> {
    const response = await apiFetch(`/document/${documentId}/revisions/${revisionId}`);
    if (!response.ok) {
        throw await toApiError(response, "Unable to load this revision. Please try again.");
    }

    return normaliseRevision(await response.json());
}
