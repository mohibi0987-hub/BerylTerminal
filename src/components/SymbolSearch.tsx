"use client";
import { useEffect, useRef, useState } from "react";

type Result = { symbol: string; name: string; exchange: string; type: string; country: string };

// Debounced so typing a full symbol doesn't fire a request per keystroke —
// meaningfully cuts Twelve Data credit usage for a feature that otherwise
// would. 350ms is long enough to skip mid-word keystrokes, short enough to
// still feel responsive.
const DEBOUNCE_MS = 350;

export function SymbolSearch({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect: (symbol: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(v: string) {
    const upper = v.toUpperCase();
    setQuery(upper);
    onChange(upper);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (upper.trim().length < 1) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market-data/search?q=${encodeURIComponent(upper)}`);
        const data = await res.json();
        if (Array.isArray(data)) { setResults(data); setOpen(data.length > 0); }
      } catch { /* search is a convenience — a failed lookup just means no dropdown, not an error banner */ }
    }, DEBOUNCE_MS);
  }

  function select(symbol: string) {
    setQuery(symbol);
    onChange(symbol);
    onSelect(symbol);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && select(query)}
        onFocus={() => results.length > 0 && setOpen(true)}
        style={{ width: 130 }}
        placeholder="Symbol"
      />
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 260, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 12px 30px -10px rgba(0,0,0,.6)", zIndex: 50, overflow: "hidden" }}>
          {results.map((r) => (
            <div
              key={r.symbol}
              onClick={() => select(r.symbol)}
              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
              onMouseDown={(e) => e.preventDefault()} // keep input focus so onClick still fires before blur closes the dropdown
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ fontWeight: 700 }}>{r.symbol}</span>
                <span style={{ color: "var(--faint)" }}>{r.exchange}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
