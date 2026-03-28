import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildForecastSeries } from "../utils/forecast";

function CustomTooltip({ active, payload, label, formatCurrency, t }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {row?.actual != null && row.actual > 0 ? (
        <p>
          {t.actual}: <strong>{formatCurrency(row.actual)}</strong>
        </p>
      ) : null}
      {row?.forecast != null ? (
        <p>
          {t.forecast}: <strong>{formatCurrency(row.forecast)}</strong>
        </p>
      ) : null}
    </div>
  );
}

export default function InsightsChart({ transactions, locale, formatCurrency, t, isDark }) {
  const { chartData, nextMonthTotal, lastMonthTotal, avgSixMonth, trendWord } = useMemo(
    () => buildForecastSeries(transactions, locale),
    [transactions, locale],
  );

  const axisColor = isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.6)";
  const gridColor = isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.06)";

  const trendLabel =
    trendWord === "up" ? t.trendUp : trendWord === "down" ? t.trendDown : t.trendSteady;

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <div>
          <h2>{t.insightsTitle}</h2>
          <p className="insights-sub">{t.insightsSubtitle}</p>
        </div>
        <div className="insights-stat-grid">
          <div className="insight-pill">
            <span className="insight-pill-label">{t.forecastNextMonth}</span>
            <span className="insight-pill-value">{formatCurrency(nextMonthTotal)}</span>
          </div>
          <div className="insight-pill muted-pill">
            <span className="insight-pill-label">{t.lastMonthSpend}</span>
            <span className="insight-pill-value">{formatCurrency(lastMonthTotal)}</span>
          </div>
          <div className="insight-pill muted-pill">
            <span className="insight-pill-label">{t.avgSixMonth}</span>
            <span className="insight-pill-value">{formatCurrency(avgSixMonth)}</span>
          </div>
        </div>
      </div>
      <p className="insights-narrative">
        {t.narrativePrefix} <strong>{trendLabel}</strong>. {t.narrativeSuffix}{" "}
        <strong>{formatCurrency(nextMonthTotal)}</strong> {t.narrativeEnd}
      </p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
            />
            <Tooltip
              content={<CustomTooltip formatCurrency={formatCurrency} t={t} />}
              cursor={{ stroke: axisColor, strokeDasharray: "4 4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Area
              type="monotone"
              dataKey="actual"
              name={t.seriesActual}
              stroke="#0d9488"
              strokeWidth={2}
              fill="url(#colorActual)"
              connectNulls
              isAnimationActive
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name={t.seriesForecast}
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="url(#colorForecast)"
              connectNulls
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-footnote">{t.chartFootnote}</p>
    </div>
  );
}
