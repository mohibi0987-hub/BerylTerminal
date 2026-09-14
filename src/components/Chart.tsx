"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type UTCTimestamp, type ISeriesApi, type IChartApi, type IPriceLine } from "lightweight-charts";
import { getCandleColors } from "@/lib/chart-appearance";

type Bar = { timestamp: string; open: number; high: number; low: number; close: number; volume: number };
type LowerPane = "volume" | "rsi" | "macd" | "none";

const RANGES = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
  { label: "All", days: null },
];

function sma(bars: Bar[], period: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    out.push({ time: Math.floor(new Date(bars[i].timestamp).getTime() / 1000) as UTCTimestamp, value: sum / period });
  }
  return out;
}

// Standard exponential moving average over closes, returned as a plain
// number[] aligned index-for-index with `bars` (needed as an intermediate
// for both the EMA overlay and MACD, which is built from two EMAs).
function emaSeries(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = new Array(closes.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) continue;
    if (prev === null) {
      // Seed with a simple average of the first `period` closes, the
      // conventional way to start an EMA.
      const slice = closes.slice(i - period + 1, i + 1);
      prev = slice.reduce((a, b) => a + b, 0) / period;
    } else {
      prev = closes[i] * k + prev * (1 - k);
    }
    out[i] = prev;
  }
  return out;
}

function rsi(bars: Bar[], period = 14) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  if (bars.length < period + 1) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change >= 0) avgGain += change; else avgLoss -= change;
  }
  avgGain /= period; avgLoss /= period;
  const push = (i: number) => {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    out.push({ time: Math.floor(new Date(bars[i].timestamp).getTime() / 1000) as UTCTimestamp, value });
  };
  push(period);
  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    push(i);
  }
  return out;
}

function macd(bars: Bar[]) {
  const closes = bars.map((b) => b.close);
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdLine: (number | null)[] = closes.map((_, i) => (ema12[i] != null && ema26[i] != null ? ema12[i]! - ema26[i]! : null));
  const macdValues = macdLine.filter((v): v is number => v != null);
  const signalRaw = emaSeries(macdValues, 9);
  // Re-align the signal EMA (computed on the filtered array) back to the original bar indices.
  const signalLine: (number | null)[] = new Array(bars.length).fill(null);
  let si = 0;
  for (let i = 0; i < bars.length; i++) {
    if (macdLine[i] != null) { signalLine[i] = signalRaw[si] ?? null; si++; }
  }
  const time = (i: number) => Math.floor(new Date(bars[i].timestamp).getTime() / 1000) as UTCTimestamp;
  const macdSeries = bars.map((_, i) => macdLine[i] != null ? { time: time(i), value: macdLine[i]! } : null).filter(Boolean) as { time: UTCTimestamp; value: number }[];
  const signalSeries = bars.map((_, i) => signalLine[i] != null ? { time: time(i), value: signalLine[i]! } : null).filter(Boolean) as { time: UTCTimestamp; value: number }[];
  const histSeries = bars.map((_, i) => (macdLine[i] != null && signalLine[i] != null)
    ? { time: time(i), value: macdLine[i]! - signalLine[i]!, color: macdLine[i]! - signalLine[i]! >= 0 ? "rgba(45,212,167,.6)" : "rgba(255,92,122,.6)" }
    : null).filter(Boolean) as { time: UTCTimestamp; value: number; color: string }[];
  return { macdSeries, signalSeries, histSeries };
}

export function Chart({
  symbol,
  interval = "1min",
  chartType = "candle",
  lowerPane = "volume",
  showSma20 = false,
  showSma50 = false,
  drawMode,
  onDrawModeChange,
}: {
  symbol: string;
  interval?: string;
  chartType?: "candle" | "line";
  lowerPane?: LowerPane;
  showSma20?: boolean;
  showSma50?: boolean;
  drawMode?: boolean;
  onDrawModeChange?: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick" | "Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const barsRef = useRef<Bar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readout, setReadout] = useState<{ last: number; change: number; changePct: number } | null>(null);
  const [activeRange, setActiveRange] = useState<string>("All");
  const [lineCount, setLineCount] = useState(0);

  // Internal draw-mode state if the parent doesn't control it.
  const [internalDrawMode, setInternalDrawMode] = useState(false);
  const effectiveDrawMode = drawMode ?? internalDrawMode;
  const setDrawMode = onDrawModeChange ?? setInternalDrawMode;
  const drawModeRef = useRef(false);
  useEffect(() => { drawModeRef.current = effectiveDrawMode; }, [effectiveDrawMode]);

  function applyRange(days: number | null) {
    const chart = chartRef.current;
    const bars = barsRef.current;
    if (!chart || bars.length === 0) return;
    if (days === null) { chart.timeScale().fitContent(); return; }
    const lastTime = Math.floor(new Date(bars[bars.length - 1].timestamp).getTime() / 1000);
    const fromTime = lastTime - days * 86400;
    const earliest = Math.floor(new Date(bars[0].timestamp).getTime() / 1000);
    chart.timeScale().setVisibleRange({ from: Math.max(fromTime, earliest) as UTCTimestamp, to: lastTime as UTCTimestamp });
  }

  function selectRange(label: string, days: number | null) {
    setActiveRange(label);
    applyRange(days);
  }

  function clearLines() {
    const series = mainSeriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((line) => series.removePriceLine(line));
    priceLinesRef.current = [];
    setLineCount(0);
  }

  useEffect(() => {
    if (!containerRef.current) return;
    setError(null);
    setReadout(null);
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: { background: { type: ColorType.Solid, color: "#0A0E17" }, textColor: "#8A94A6" },
      grid: { vertLines: { color: "rgba(255,255,255,.04)" }, horzLines: { color: "rgba(255,255,255,.04)" } },
      timeScale: { borderColor: "#1E2733" },
      rightPriceScale: { borderColor: "#1E2733" },
    });
    chartRef.current = chart;

    const { up, down } = getCandleColors();
    const mainSeries = chartType === "line"
      ? chart.addLineSeries({ color: up, lineWidth: 2 })
      : chart.addCandlestickSeries({ upColor: up, downColor: down, borderVisible: false, wickUpColor: up, wickDownColor: down });
    mainSeriesRef.current = mainSeries as ISeriesApi<"Candlestick" | "Line">;
    priceLinesRef.current = [];
    setLineCount(0);

    // Lower pane — Volume, RSI, or MACD, mutually exclusive. Stacking all
    // three at once got visually cramped and none of them read clearly, so
    // this is a deliberate single-select instead of trying to cram all of
    // TradingView's default panes into the same space.
    let volumeSeries: ISeriesApi<"Histogram"> | null = null;
    let rsiSeries: ISeriesApi<"Line"> | null = null;
    let macdLineSeries: ISeriesApi<"Line"> | null = null;
    let macdSignalSeries: ISeriesApi<"Line"> | null = null;
    let macdHistSeries: ISeriesApi<"Histogram"> | null = null;

    if (lowerPane === "volume") {
      volumeSeries = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "lower", color: up });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    } else if (lowerPane === "rsi") {
      rsiSeries = chart.addLineSeries({ color: "#A78BFA", lineWidth: 2, priceScaleId: "lower", priceLineVisible: false, lastValueVisible: true });
      rsiSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    } else if (lowerPane === "macd") {
      macdHistSeries = chart.addHistogramSeries({ priceScaleId: "lower" });
      macdHistSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      macdLineSeries = chart.addLineSeries({ color: "#5B8DEF", lineWidth: 1, priceScaleId: "lower", priceLineVisible: false, lastValueVisible: false });
      macdSignalSeries = chart.addLineSeries({ color: "#F5A623", lineWidth: 1, priceScaleId: "lower", priceLineVisible: false, lastValueVisible: false });
    }

    let sma20Series: ISeriesApi<"Line"> | null = null;
    if (showSma20) sma20Series = chart.addLineSeries({ color: "#F5A623", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    let sma50Series: ISeriesApi<"Line"> | null = null;
    if (showSma50) sma50Series = chart.addLineSeries({ color: "#5B8DEF", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    function handleChartClick(param: any) {
      if (!drawModeRef.current || !param.point || !mainSeriesRef.current) return;
      const price = mainSeriesRef.current.coordinateToPrice(param.point.y);
      if (price == null) return;
      const line = mainSeriesRef.current.createPriceLine({ price, color: "#F5A623", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: price.toFixed(2) });
      priceLinesRef.current.push(line);
      setLineCount(priceLinesRef.current.length);
    }
    chart.subscribeClick(handleChartClick);

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/market-data/bars?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputSize=150`);
        let bars: any = null;
        try { bars = await res.json(); } catch { /* non-JSON error body — server-side crash, not our route's own error */ }
        if (cancelled) return;
        if (!res.ok || !Array.isArray(bars)) {
          setError(bars?.error ?? `Chart data unavailable right now (${res.status}). Retrying…`);
          return;
        }
        setError(null);
        const typedBars = bars as Bar[];
        barsRef.current = typedBars;

        if (chartType === "line") {
          (mainSeries as ISeriesApi<"Line">).setData(typedBars.map((b) => ({ time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp, value: b.close })));
        } else {
          (mainSeries as ISeriesApi<"Candlestick">).setData(typedBars.map((b) => ({ time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close })));
        }

        if (volumeSeries) {
          volumeSeries.setData(typedBars.map((b) => ({ time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp, value: b.volume, color: b.close >= b.open ? `${up}80` : `${down}80` })));
        }
        if (rsiSeries) rsiSeries.setData(rsi(typedBars, 14));
        if (macdLineSeries && macdSignalSeries && macdHistSeries) {
          const { macdSeries, signalSeries, histSeries } = macd(typedBars);
          macdLineSeries.setData(macdSeries);
          macdSignalSeries.setData(signalSeries);
          macdHistSeries.setData(histSeries);
        }
        if (sma20Series) sma20Series.setData(sma(typedBars, 20));
        if (sma50Series) sma50Series.setData(sma(typedBars, 50));

        if (typedBars.length > 1) {
          const first = typedBars[0].open;
          const last = typedBars[typedBars.length - 1].close;
          const change = last - first;
          setReadout({ last, change, changePct: (change / first) * 100 });
        }
        const range = RANGES.find((r) => r.label === activeRange);
        applyRange(range ? range.days : null);
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Retrying…");
      }
    }
    load();
    const poll = setInterval(load, 15000); // stays under Twelve Data's free-tier 8 req/min limit

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth, height: containerRef.current!.clientHeight });
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener("resize", onResize);
      chart.unsubscribeClick(handleChartClick);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, chartType, lowerPane, showSma20, showSma50]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {readout && (
          <div style={{ position: "absolute", top: 10, left: 12, zIndex: 2, display: "flex", alignItems: "baseline", gap: 8, pointerEvents: "none" }}>
            <span className="mono disp" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{readout.last.toFixed(2)}</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: readout.change >= 0 ? "var(--green)" : "var(--red)" }}>
              {readout.change >= 0 ? "+" : ""}{readout.change.toFixed(2)} ({readout.change >= 0 ? "+" : ""}{readout.changePct.toFixed(2)}%)
            </span>
            {showSma20 && <span className="mono" style={{ fontSize: 11, color: "#F5A623" }}>SMA 20</span>}
            {showSma50 && <span className="mono" style={{ fontSize: 11, color: "#5B8DEF" }}>SMA 50</span>}
          </div>
        )}

        {error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ background: "rgba(13,18,32,.92)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 20px", maxWidth: 340, textAlign: "center" }}>
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{error}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 26, display: "flex", alignItems: "center", gap: 2, padding: "0 10px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        {RANGES.map((r) => (
          <button key={r.label} onClick={() => selectRange(r.label, r.days)} style={{ padding: "2px 8px", borderRadius: 4, border: "none", fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: activeRange === r.label ? "var(--panel2)" : "transparent", color: activeRange === r.label ? "var(--text)" : "var(--faint)" }}>
            {r.label}
          </button>
        ))}
        <span style={{ width: 1, height: 14, background: "var(--border)", margin: "0 6px" }} />
        <button onClick={() => setDrawMode(!effectiveDrawMode)} title="Click the chart to drop a horizontal price line" style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: effectiveDrawMode ? "var(--green-dim)" : "transparent", color: effectiveDrawMode ? "var(--green)" : "var(--faint)" }}>
          {effectiveDrawMode ? "Drawing…" : "+ Line"}
        </button>
        {lineCount > 0 && (
          <button onClick={clearLines} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: "transparent", color: "var(--faint)" }}>
            Clear ({lineCount})
          </button>
        )}
      </div>
    </div>
  );
}
