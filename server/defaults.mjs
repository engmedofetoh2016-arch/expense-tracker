export const DEFAULT_CATEGORIES = [
  { slug: "food", label: "Food", color: "#f97316" },
  { slug: "housing", label: "Housing", color: "#6366f1" },
  { slug: "utilities", label: "Utilities", color: "#eab308" },
  { slug: "transport", label: "Transport", color: "#0ea5e9" },
  { slug: "entertainment", label: "Entertainment", color: "#ec4899" },
  { slug: "salary", label: "Salary", color: "#22c55e" },
  { slug: "other", label: "Other", color: "#64748b" },
];

export function slugifyCategory(label) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 40) || "category";
}

export function mapCategory(row) {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    color: row.color,
  };
}
