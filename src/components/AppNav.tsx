"use client";
import { useEffect, useRef, useState } from "react";

// Reachable from every logged-in page (Terminal, Markets, Settings) so
// nothing requires the browser back button — except the homepage itself,
// which is intentionally left out here on request: from inside the app,
// it's only reachable by pressing back or typing the bare domain directly.
const LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/terminal", label: "Terminal" },
  { href: "/settings", label: "Settings" },
  { href: "/pricing", label: "Pricing" },
  { href: "/refer", label: "Refer a friend" },
  { href: "/support", label: "Help & Support" },
  { href: "/changelog", label: "What's New" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function AppNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: open ? "var(--panel2)" : "transparent", color: "var(--muted)", cursor: "pointer" }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>☰</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 180, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)", zIndex: 100, overflow: "hidden" }}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "var(--text)", textDecoration: "none", borderBottom: "1px solid var(--border)" }}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
