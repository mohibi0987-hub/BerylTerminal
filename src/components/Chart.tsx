"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type UTCTimestamp } from "lightweight-charts";

export function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setError(null);
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
        const res = await fetch(`/api/market-data/bars?symbol=${encodeURIComponent(symbol)}&interval=1min&outputSize=150`);
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
  }, [symbol]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
