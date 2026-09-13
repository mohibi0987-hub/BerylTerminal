"use client";
import { useState } from "react";

export function TwoFactorVerifyGate({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/2fa/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) onVerified();
    else setError(data.error ?? "That code didn't work.");
  }

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 12, padding: 28, width: 340 }}>
        <div className="disp" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Enter your authentication code</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>
          This account has two-factor authentication enabled — enter the current code from your authenticator app.
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          placeholder="6-digit code"
          maxLength={6}
          autoFocus
          style={{ width: "100%", marginBottom: 10, textAlign: "center", fontSize: 18, letterSpacing: 4 }}
        />
        {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{error}</div>}
        <button onClick={verify} disabled={busy || code.length < 6} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, cursor: "pointer" }}>
          {busy ? "Verifying…" : "Verify"}
        </button>
      </div>
    </div>
  );
}
