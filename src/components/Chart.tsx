"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type UTCTimestamp } from "lightweight-charts";

export function Chart({ symbol, interval = "1min" }: { symbol: string; interval?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Derived from the same bars response used to draw the candles — a
  // TradingView-style price/change readout costs nothing extra to compute.
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
        series.setData(bars.map((b: any) => ({
          time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp,
          open: b.open, high: b.high, low: b.low, close: b.close,
        })));
        if (bars.length > 1) {
          const first = bars[0].open;
          const last = bars[bars.length - 1].close;
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
  }, [symbol, interval]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {readout && (
        <div style={{ position: "absolute", top: 10, left: 12, zIndex: 2, display: "flex", alignItems: "baseline", gap: 8, pointerEvents: "none" }}>
          <span className="mono disp" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{readout.last.toFixed(2)}</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: readout.change >= 0 ? "var(--green)" : "var(--red)" }}>
            {readout.change >= 0 ? "+" : ""}{readout.change.toFixed(2)} ({readout.change >= 0 ? "+" : ""}{readout.changePct.toFixed(2)}%)
          </span>
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
