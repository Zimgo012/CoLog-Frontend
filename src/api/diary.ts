import { apiFetch } from "./client";

async function responseBody(response: Response) {
    const body = await response.text();
    if (!body) return null;

    try {
        return JSON.parse(body);
    } catch {
        return body;
    }
}

//get all diaries
export async function getDiaries() {
    const response = await apiFetch("/diary/my");

    if (!response.ok) {
        throw new Error("Failed to get diaries");
    }

    return response.json();
}

// get all collaborated diaries
export async function getCollaboratedDiaries() {
    const response = await apiFetch("/diary/collaborated");

    if (!response.ok) {
        throw new Error("Failed to get diaries");
    }

    return response.json();
}


//get diary by id
export async function getDiary(id: number) {
    const response = await apiFetch(`/diary/${id}`);

    if (!response.ok) {
        throw new Error("Failed to get diaries");
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
        throw new Error(`Failed to create diary: ${response.status}`);
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
        throw new Error(`Failed to edit diary: ${response.status}`);
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
        throw new Error(`Failed to create diary: ${response.status}`);
    }

    return response.json();
}


// show collaborators
export async function getAllCollaborators(diaryId: number) {
    const response = await apiFetch(`/diary/${diaryId}/collaborators/`, {
        method: "GET",

    })

    if (!response.ok) {
        throw new Error(`Failed to get diary: ${response.status}`);
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
        throw new Error(`Failed to add collaborator: ${response.status}`);
    }

    return responseBody(response);
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
        throw new Error(`Failed to remove collaborator: ${response.status}`);
    }

    return responseBody(response);
}
