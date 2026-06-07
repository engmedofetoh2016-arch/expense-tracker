export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "AED", label: "UAE Dirham" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "INR", label: "Indian Rupee" },
  { code: "TRY", label: "Turkish Lira" },
];

const CODE_SET = new Set(SUPPORTED_CURRENCIES.map((item) => item.code));

export function normalizeCurrency(code, fallback = "USD") {
  const upper = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (CODE_SET.has(upper)) return upper;
  return CODE_SET.has(fallback) ? fallback : "USD";
}

const rateCache = new Map();

function cacheKey(date, from, to) {
  return `${date}:${from}:${to}`;
}

async function fetchFrankfurterRate(date, from, to) {
  if (from === to) return 1;

  const key = cacheKey(date, from, to);
  if (rateCache.has(key)) return rateCache.get(key);

  const url = `https://api.frankfurter.app/${date}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch exchange rate (${response.status}).`);
  }

  const body = await response.json();
  const rate = body?.rates?.[to];
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Exchange rate unavailable for ${from} → ${to}.`);
  }

  rateCache.set(key, rate);
  return rate;
}

export async function convertToBase(amount, currency, baseCurrency, date) {
  const from = normalizeCurrency(currency, baseCurrency);
  const to = normalizeCurrency(baseCurrency, "USD");
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    throw new Error("Invalid amount for conversion.");
  }
  if (from === to) {
    return Math.round(value * 100) / 100;
  }
  const rate = await fetchFrankfurterRate(date, from, to);
  return Math.round(value * rate * 100) / 100;
}

export async function getExchangeRate(from, to, date) {
  const normalizedFrom = normalizeCurrency(from);
  const normalizedTo = normalizeCurrency(to);
  if (normalizedFrom === normalizedTo) {
    return { from: normalizedFrom, to: normalizedTo, date, rate: 1 };
  }
  const rate = await fetchFrankfurterRate(date, normalizedFrom, normalizedTo);
  return { from: normalizedFrom, to: normalizedTo, date, rate };
}
