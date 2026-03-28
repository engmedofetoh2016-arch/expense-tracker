const CATEGORY_RULES = [
  { category: "food", re: /\b(starbucks|mcdonald|restaurant|cafe|coffee|grocery|groceries|whole\s*foods|kroger|safeway|subway|pizza|burger|taco|dining|bakery|supermarket)\b/i },
  { category: "housing", re: /\b(rent|apartment|lease|landlord|mortgage|hoa)\b/i },
  { category: "utilities", re: /\b(electric|water\s*bill|utility|gas\s*bill|internet|wifi|power\s*co)\b/i },
  { category: "transport", re: /\b(uber|lyft|taxi|shell|exxon|chevron|bp\s|gas\s|fuel|parking|metro|transit)\b/i },
  { category: "entertainment", re: /\b(netflix|spotify|hulu|cinema|theater|steam|games)\b/i },
];

export function guessCategoryFromText(text) {
  const blob = text.slice(0, 2000);
  for (const { category, re } of CATEGORY_RULES) {
    if (re.test(blob)) return category;
  }
  return "other";
}

function parseMoneyTokens(line) {
  const out = [];
  const re = /(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})\b/g;
  let m = re.exec(line);
  while (m) {
    const whole = m[1].replace(/,/g, "");
    const val = Number(`${whole}.${m[2]}`);
    if (!Number.isNaN(val) && val >= 0.01 && val < 100_000) out.push(val);
    m = re.exec(line);
  }
  return out;
}

function pickTotalAmount(text, lines) {
  let best = null;
  let bestScore = -1;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isSubtotal = /\bsubtotal\b/.test(lower);
    const totalish =
      /\b(grand\s*)?total\b|\bamount\s*due\b|\bbalance\s*due\b|\bpay\s*this\b|\btotal\s*amount\b/i.test(lower) && !isSubtotal;
    const nums = parseMoneyTokens(line);
    for (const val of nums) {
      let score = val;
      if (totalish) score += 50_000;
      if (isSubtotal) score -= 40_000;
      if (score > bestScore) {
        bestScore = score;
        best = val;
      }
    }
  }
  if (best != null) return best;
  const all = [];
  for (const line of lines) {
    all.push(...parseMoneyTokens(line));
  }
  if (!all.length) return null;
  return Math.max(...all);
}

function parseDateFromText(text) {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdy = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2}|\d{2})\b/);
  if (mdy) {
    let y = Number(mdy[3]);
    if (y < 100) y += 2000;
    const mo = String(Number(mdy[1])).padStart(2, "0");
    const da = String(Number(mdy[2])).padStart(2, "0");
    if (Number(mo) <= 12) return `${y}-${mo}-${da}`;
  }
  const dmy = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (dmy) {
    const da = String(Number(dmy[1])).padStart(2, "0");
    const mo = String(Number(dmy[2])).padStart(2, "0");
    const y = dmy[3];
    if (Number(mo) <= 12) return `${y}-${mo}-${da}`;
  }
  return null;
}

function pickMerchant(lines) {
  const skip = /^(total|tax|date|time|thank|receipt|cash|change|visa|master)/i;
  for (const line of lines) {
    if (line.length < 3 || line.length > 64) continue;
    if (/^\d+$/.test(line)) continue;
    if (skip.test(line)) continue;
    if (/^\d{1,2}[/.-]\d/.test(line)) continue;
    return line.slice(0, 80);
  }
  return lines[0]?.slice(0, 80) || "Receipt";
}

/**
 * @param {string} rawText
 * @returns {{ description: string, amount: number | null, date: string, category: string }}
 */
export function parseReceiptText(rawText) {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const amount = pickTotalAmount(text, lines);
  const parsedDate = parseDateFromText(text);
  const today = new Date().toISOString().split("T")[0];
  const date = parsedDate || today;
  const description = pickMerchant(lines);
  const category = guessCategoryFromText(text);
  return { description, amount, date, category };
}
