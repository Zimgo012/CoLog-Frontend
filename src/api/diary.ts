import { apiFetch } from "./client";

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
export async function getAllCollborators(diaryId: number) {
    const response = await apiFetch(`/diary/${diaryId}/collaborators/`, {
        method: "GET",

    })

    if (!response.ok) {
        throw new Error(`Failed to get diary: ${response.status}`);
    }

    return response.json();
}

// invite collaborator



