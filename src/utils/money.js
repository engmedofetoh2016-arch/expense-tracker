export function transactionAmountBase(tx) {
  const base = Number(tx.amountBase);
  const amount = Number(tx.amount);
  if (Number.isFinite(base) && base > 0) return base;
  return Number.isFinite(amount) ? amount : 0;
}

export function formatMoney(value, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
