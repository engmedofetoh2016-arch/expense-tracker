function monthKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * @param {Array<{ date: string, amount: number, type: string }>} transactions
 * @param {string} locale
 */
export function buildForecastSeries(transactions, locale) {
  const expenses = transactions.filter((tx) => tx.type === "expense");
  const byMonth = new Map();
  for (const tx of expenses) {
    const key = tx.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) || 0) + Number(tx.amount));
  }

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKeyFromDate(d);
    const label = d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
    months.push({ key, label, monthStart: d, actual: byMonth.get(key) ?? 0 });
  }

  const points = months.map((row, x) => ({ x, y: row.actual }));
  const { slope, intercept } = linearRegression(points);
  const nextIndex = months.length;
  const rawNext = intercept + slope * nextIndex;
  const nextMonthTotal = Math.max(0, Math.round(rawNext * 100) / 100);

  const nextD = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextLabel = nextD.toLocaleDateString(locale, { month: "short", year: "2-digit" });

  const chartData = months.map((row) => ({
    name: row.label,
    actual: row.actual,
    forecast: null,
  }));

  const lastActual = months[months.length - 1]?.actual ?? 0;
  chartData.push({
    name: `${nextLabel} *`,
    actual: null,
    forecast: nextMonthTotal,
  });

  const avg6 = months.reduce((s, r) => s + r.actual, 0) / Math.max(months.length, 1);
  const trendWord =
    slope > 5 ? "up" : slope < -5 ? "down" : "steady";

  return {
    chartData,
    nextMonthTotal,
    lastMonthTotal: lastActual,
    avgSixMonth: Math.round(avg6 * 100) / 100,
    trendWord,
    slope,
  };
}
