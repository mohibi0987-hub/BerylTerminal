"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type UTCTimestamp, type ISeriesApi } from "lightweight-charts";

type Bar = { timestamp: string; open: number; high: number; low: number; close: number; volume: number };

function sma(bars: Bar[], period: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    out.push({ time: Math.floor(new Date(bars[i].timestamp).getTime() / 1000) as UTCTimestamp, value: sum / period });
  }
  return out;
}

export function Chart({
  symbol,
  interval = "1min",
  showVolume = true,
  showSma20 = false,
  showSma50 = false,
}: {
  symbol: string;
  interval?: string;
  showVolume?: boolean;
  showSma20?: boolean;
  showSma50?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [readout, setReadout] = useState<{ last: number; change: number; changePct: number } | null>(null);

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
    const series = chart.addCandlestickSeries({
      upColor: "#2DD4A7", downColor: "#FF5C7A", borderVisible: false,
      wickUpColor: "#2DD4A7", wickDownColor: "#FF5C7A",
    });

    // Volume as a squeezed-in bottom subpane, same visual convention as
    // TradingView's default layout — shares the chart's own price scale
    // via a separate scale id so it doesn't distort the candles.
    let volumeSeries: ISeriesApi<"Histogram"> | null = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        color: "#2DD4A7",
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    }

    let sma20Series: ISeriesApi<"Line"> | null = null;
    if (showSma20) sma20Series = chart.addLineSeries({ color: "#F5A623", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    let sma50Series: ISeriesApi<"Line"> | null = null;
    if (showSma50) sma50Series = chart.addLineSeries({ color: "#5B8DEF", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

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
        series.setData(typedBars.map((b) => ({
          time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp,
          open: b.open, high: b.high, low: b.low, close: b.close,
        })));
        if (volumeSeries) {
          volumeSeries.setData(typedBars.map((b) => ({
            time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp,
            value: b.volume,
            color: b.close >= b.open ? "rgba(45,212,167,.5)" : "rgba(255,92,122,.5)",
          })));
        }
        if (sma20Series) sma20Series.setData(sma(typedBars, 20));
        if (sma50Series) sma50Series.setData(sma(typedBars, 50));
        if (typedBars.length > 1) {
          const first = typedBars[0].open;
          const last = typedBars[typedBars.length - 1].close;
          const change = last - first;
          setReadout({ last, change, changePct: (change / first) * 100 });
        }
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
      chart.remove();
    };
  }, [symbol, interval, showVolume, showSma20, showSma50]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
  );
}
