import { apiFetch } from "./httpClient.js";

export async function downloadFullBackup() {
  const response = await fetch("/api/backup/download", { credentials: "include" });
  if (!response.ok) {
    let message = "Backup failed";
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowspend-full-backup-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreFullBackup(payload) {
  const data = await apiFetch("/api/backup/restore", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}
