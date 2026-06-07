const LEGACY_TX_PREFIX = "finance_transactions_";

export function collectLegacyTransactions() {
  const merged = [];
  const seen = new Set();

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(LEGACY_TX_PREFIX)) continue;

    let parsed;
    try {
      parsed = JSON.parse(localStorage.getItem(key));
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    for (const item of parsed) {
      const fingerprint = `${item.description}|${item.amount}|${item.date}|${item.type}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      merged.push({
        description: item.description,
        amount: item.amount,
        type: item.type,
        category: item.category,
        date: item.date,
      });
    }
  }

  return merged;
}

export function clearLegacyFinanceStorage() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (
      key?.startsWith(LEGACY_TX_PREFIX) ||
      key === "finance_active_user" ||
      key === "finance_users"
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
