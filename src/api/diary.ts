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
// {
//     "id": 1,
//     "title": "diary1",
//     "createdAt": "2026-09-01",
//     "owner": null,
//     "emoji": "",
//     "color": ""
// }


//delete diary
// {
//      "id":id
//      "title" : title
//}




// invite collaborator

// show collaborators

