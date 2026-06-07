function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseType(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "income" || normalized === "in") return "income";
  if (normalized === "expense" || normalized === "out" || normalized === "expenses") return "expense";
  return null;
}

function parseDate(value) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    const month = a.padStart(2, "0");
    const day = b.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * @param {string} text raw CSV file contents
 * @returns {Array<{ description: string, amount: number, type: string, category: string, date: string }>}
 */
export function parseTransactionsCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const rows = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const description = cells[index.description] ?? cells[index.desc] ?? "";
    const amountRaw = cells[index.amount] ?? cells[index.value] ?? "";
    const typeRaw = cells[index.type] ?? cells[index.kind] ?? "expense";
    const category = cells[index.category] ?? cells[index.category_slug] ?? "other";
    const dateRaw = cells[index.date] ?? "";

    const amount = Number(String(amountRaw).replace(/[^0-9.-]/g, ""));
    const type = parseType(typeRaw);
    const date = parseDate(dateRaw);

    if (!description || !Number.isFinite(amount) || amount <= 0 || !type || !date) {
      continue;
    }

    rows.push({
      description: description.slice(0, 200),
      amount: Math.round(Math.abs(amount) * 100) / 100,
      type,
      category,
      date,
    });
  }

  return rows;
}

export function exportFilteredCsv(rows, filename) {
  const header = "date,description,amount,type,category";
  const lines = rows.map((row) =>
    [row.date, row.description, row.amount, row.type, row.category]
      .map((value) => {
        const text = String(value ?? "");
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(","),
  );
  const blob = new Blob([`\uFEFF${[header, ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonBackup({ categories, transactions, userName }) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userName,
    categories,
    transactions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowspend-backup-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseJsonBackup(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.transactions)) {
    throw new Error("Invalid backup file.");
  }
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    transactions: data.transactions,
  };
}
