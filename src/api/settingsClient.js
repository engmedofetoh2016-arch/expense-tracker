import { apiFetch } from "./httpClient.js";

export async function fetchSettings() {
  const data = await apiFetch("/api/settings");
  return data.settings;
}

export async function updateSettings(payload) {
  const data = await apiFetch("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.settings;
}

export async function fetchSupportedCurrencies() {
  const data = await apiFetch("/api/currency/supported");
  return data.currencies;
}
