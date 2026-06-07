import { prisma } from "./db.mjs";
import { DEFAULT_CATEGORIES, mapCategory, slugifyCategory } from "./defaults.mjs";

export async function ensureDefaultCategories(userId) {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((item) => ({
      userId,
      slug: item.slug,
      label: item.label,
      color: item.color,
    })),
  });
}

export async function listUserCategories(userId) {
  await ensureDefaultCategories(userId);
  const rows = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ label: "asc" }],
  });
  return rows.map(mapCategory);
}

export async function getUserCategorySlugs(userId) {
  const categories = await listUserCategories(userId);
  return new Set(categories.map((item) => item.slug));
}

export async function resolveCategorySlug(userId, rawCategory) {
  const categories = await listUserCategories(userId);
  const normalized = typeof rawCategory === "string" ? rawCategory.trim().toLowerCase() : "";
  if (!normalized) return "other";

  const bySlug = categories.find((item) => item.slug === normalized);
  if (bySlug) return bySlug.slug;

  const byLabel = categories.find((item) => item.label.trim().toLowerCase() === normalized);
  if (byLabel) return byLabel.slug;

  return categories.some((item) => item.slug === "other") ? "other" : categories[0]?.slug ?? "other";
}

export async function uniqueSlugForUser(userId, label) {
  const base = slugifyCategory(label);
  const existing = await prisma.category.findMany({
    where: { userId, slug: { startsWith: base } },
    select: { slug: true },
  });
  const taken = new Set(existing.map((item) => item.slug));
  if (!taken.has(base)) return base;

  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 40);
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`.slice(0, 40);
}

export { mapCategory, slugifyCategory };
