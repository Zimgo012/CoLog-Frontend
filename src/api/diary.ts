import { apiFetch, toApiError } from "./client";

//get all diaries
export async function getDiaries() {
    const response = await apiFetch("/diary/my");

    if (!response.ok) {
        throw await toApiError(response, "Unable to load your diaries. Please try again.");
    }

    return response.json();
}

// get all collaborated diaries
export async function getCollaboratedDiaries() {
    const response = await apiFetch("/diary/collaborated");

    if (!response.ok) {
        throw await toApiError(response, "Unable to load shared diaries. Please try again.");
    }

    return response.json();
}


//get diary by id
export async function getDiary(id: number) {
    const response = await apiFetch(`/diary/${id}`);

    if (!response.ok) {
        throw await toApiError(response, "Unable to load this diary. Please try again.");
    }

    return response.json();
}

// add diary
export async function addDiary(body: object) {
    const response = await apiFetch("/diary/create", {
        method: "POST",
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw await toApiError(response, "Unable to create this diary. Please try again.");
    }

    return response.json();
}

//edit diary
export interface DiaryEditPayload {
    title?: string
    emoji?: string
    color?: string
}

export async function editDiary(diaryId: number, body: DiaryEditPayload) {
    const response = await apiFetch(`/diary/${diaryId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw await toApiError(response, "Unable to update this diary. Please try again.");
    }

    return response.json();
}


//delete diary
// {
//      "id":id
//      "title" : title
//}
export async function deleteDiary(diaryId : number) {
    const response = await apiFetch(`/diary/${diaryId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw await toApiError(response, "Unable to delete this diary. Please try again.");
    }

    return response.json();
}


// show collaborators
export async function getAllCollaborators(diaryId: number) {
    const response = await apiFetch(`/diary/${diaryId}/collaborators/`, {
        method: "GET",

    })

    if (!response.ok) {
        throw await toApiError(response, "Unable to load collaborators. Please try again.");
    }

    return response.json();
}

// Kept for existing callers that use the original misspelled export.
export const getAllCollborators = getAllCollaborators;

// add collaborator /diary/{diaryId}/add/collaborator
// body:
//{
//      String email - email of added collaborator
//}
export async function addCollaborator(diaryId: number, email: string) {
    const response = await apiFetch(`/diary/${diaryId}/add/collaborator`, {
        method: "POST",
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        throw await toApiError(response, "Unable to add this collaborator. Please try again.");
    }

    return response.json().catch(() => null);
}

// remove /diary/{diaryId}/remove/collaborator
// body:
//{
//      String email - email of removed collaborator
//}
export async function removeCollaborator(diaryId: number, email: string) {
    const response = await apiFetch(`/diary/${diaryId}/remove/collaborator`, {
        method: "DELETE",
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        throw await toApiError(response, "Unable to remove this collaborator. Please try again.");
    }

    return response.json().catch(() => null);
}
