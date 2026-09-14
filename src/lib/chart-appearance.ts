// Candle colors are a genuine per-user preference (from the reference
// index.html's Settings modal) — stored locally and read by Chart.tsx on
// mount. Not synced server-side; this is a display preference, not account
// data.
const KEY = "beryl.chart.candleColors";

export type CandleColors = { up: string; down: string };

export const DEFAULT_CANDLE_COLORS: CandleColors = { up: "#2DD4A7", down: "#FF5C7A" };

export function getCandleColors(): CandleColors {
  if (typeof window === "undefined") return DEFAULT_CANDLE_COLORS;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...DEFAULT_CANDLE_COLORS, ...JSON.parse(saved) };
  } catch { /* ignore bad JSON */ }
  return DEFAULT_CANDLE_COLORS;
}

export function setCandleColors(colors: CandleColors) {
  try { localStorage.setItem(KEY, JSON.stringify(colors)); } catch { /* localStorage unavailable */ }
}
