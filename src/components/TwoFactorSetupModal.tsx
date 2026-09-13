"use client";
import { useState } from "react";

export function TwoFactorSetupModal({ onClose, onEnabled }: { onClose: () => void; onEnabled: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const res = await fetch("/api/2fa");
    const data = await res.json();
    setBusy(false);
    if (res.ok) { setQrDataUrl(data.qrDataUrl); setSecret(data.secret); }
    else setError(data.error ?? "Couldn't start setup.");
  }

  async function confirm() {
    if (!secret || !code) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, code }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) onEnabled();
    else setError(data.error ?? "Couldn't verify that code.");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, width: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="disp" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Set up two-factor authentication</div>

        {!qrDataUrl ? (
          <>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Adds a code from an authenticator app (Google Authenticator, Authy, 1Password, etc.) as a second step
              required alongside your regular sign-in, checked by this app specifically.
            </div>
            <button onClick={start} disabled={busy} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, cursor: "pointer" }}>
              {busy ? "Generating…" : "Get started"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>Scan this with your authenticator app:</div>
            <img src={qrDataUrl} alt="2FA setup QR code" style={{ width: "100%", borderRadius: 8, marginBottom: 14 }} />
            <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 14 }}>
              Can't scan it? Enter this key manually: <span className="mono">{secret}</span>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the 6-digit code"
              maxLength={6}
              style={{ width: "100%", marginBottom: 10, textAlign: "center", fontSize: 16, letterSpacing: 4 }}
            />
            {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{error}</div>}
            <button onClick={confirm} disabled={busy || code.length < 6} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, cursor: "pointer" }}>
              {busy ? "Verifying…" : "Confirm & enable"}
            </button>
          </>
        )}

        <button onClick={onClose} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
