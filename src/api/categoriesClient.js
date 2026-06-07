import { apiFetch } from "./httpClient.js";

export async function fetchCategories() {
  const data = await apiFetch("/api/categories");
  return data.categories;
}

export async function createCategory(payload) {
  const data = await apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.category;
}

export async function updateCategory(id, payload) {
  const data = await apiFetch(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.category;
}

export async function deleteCategory(id) {
  await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
}
