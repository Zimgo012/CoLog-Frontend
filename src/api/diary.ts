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