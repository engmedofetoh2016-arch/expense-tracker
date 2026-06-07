async function parseJsonResponse(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.code = body.code;
    error.duplicate = body.duplicate;
    error.duplicateReceipt = body.duplicateReceipt;
    throw error;
  }
  return body;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  return parseJsonResponse(response);
}
