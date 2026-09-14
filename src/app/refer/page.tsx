"use client";
import { useState } from "react";

// Deliberately doesn't show a reward amount or track referrals — there's no
// actual reward program or attribution system built yet, and TradingView's
// own "$0 earned" placeholder is exactly the kind of thing not to copy
// here: it implies a working rewards system where none exists. This is
// just a plain shareable link, honestly framed as that.
export default function ReferPage() {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "";

  function copy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0E17", color: "var(--text)", padding: 20 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 className="disp" style={{ fontSize: 24, marginBottom: 10 }}>Share BerylTerminal</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
          There's no referral rewards program yet — this is just a plain link if you want to tell someone about it.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input readOnly value={shareUrl} style={{ flex: 1, fontSize: 12.5 }} onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button onClick={copy} className="btn btn-primary" style={{ flexShrink: 0 }}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
