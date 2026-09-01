"use client";
import { useEffect, useRef } from "react";
import { createChart, ColorType, type UTCTimestamp } from "lightweight-charts";

export function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
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
      const res = await fetch(`/api/market-data/bars?symbol=${encodeURIComponent(symbol)}&interval=1min&outputSize=150`);
      const bars = await res.json();
      if (cancelled || !Array.isArray(bars)) return;
      series.setData(bars.map((b: any) => ({
        time: Math.floor(new Date(b.timestamp).getTime() / 1000) as UTCTimestamp,
        open: b.open, high: b.high, low: b.low, close: b.close,
      })));
    }
    load();
    const poll = setInterval(load, 5000); // real polling refresh — see README for upgrading to true WebSocket streaming

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth, height: containerRef.current!.clientHeight });
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [symbol]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
