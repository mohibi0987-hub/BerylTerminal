"use client";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Something went wrong."); return; }
    window.location.href = "/";
  }

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: 360, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <div className="disp" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 18, marginBottom: 18, justifyContent: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 12px rgba(45,212,167,.65)" }} />
          BerylTerminal
        </div>
        <div style={{ display: "flex", marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
          <div onClick={() => setMode("login")} style={{ flex: 1, textAlign: "center", padding: 10, cursor: "pointer", color: mode === "login" ? "var(--text)" : "var(--muted)", borderBottom: mode === "login" ? "2px solid var(--green)" : "none" }}>Sign in</div>
          <div onClick={() => setMode("signup")} style={{ flex: 1, textAlign: "center", padding: 10, cursor: "pointer", color: mode === "signup" ? "var(--text)" : "var(--muted)", borderBottom: mode === "signup" ? "2px solid var(--green)" : "none" }}>Create account</div>
        </div>
        {mode === "signup" && (
          <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
        )}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginBottom: 14 }} />
        {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: 11, borderRadius: 6, border: "none", background: "var(--green)", color: "#04150F", fontWeight: 700 }}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </div>
    </div>
  );
}
