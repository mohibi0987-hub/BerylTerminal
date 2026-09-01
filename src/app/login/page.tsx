"use client";
import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!signInLoaded) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete") {
        await setActiveSignIn({ session: attempt.createdSessionId });
        router.push("/");
      } else {
        setError("Additional verification is required for this account — not yet supported here.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUpStart() {
    if (!signUpLoaded) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password, firstName: name || undefined });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!signUpLoaded) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === "complete") {
        await setActiveSignUp({ session: attempt.createdSessionId });
        router.push("/");
      } else {
        setError("That code didn't work — check it and try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (verifying) return handleVerify();
    if (mode === "login") return handleSignIn();
    return handleSignUpStart();
  }

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: 360, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <div className="disp" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 18, marginBottom: 18, justifyContent: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 12px rgba(45,212,167,.65)" }} />
          BerylTerminal
        </div>

        {!verifying && (
          <div style={{ display: "flex", marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <div onClick={() => { setMode("login"); setError(null); }} style={{ flex: 1, textAlign: "center", padding: 10, cursor: "pointer", color: mode === "login" ? "var(--text)" : "var(--muted)", borderBottom: mode === "login" ? "2px solid var(--green)" : "none" }}>Sign in</div>
            <div onClick={() => { setMode("signup"); setError(null); }} style={{ flex: 1, textAlign: "center", padding: 10, cursor: "pointer", color: mode === "signup" ? "var(--text)" : "var(--muted)", borderBottom: mode === "signup" ? "2px solid var(--green)" : "none" }}>Create account</div>
          </div>
        )}

        {verifying ? (
          <>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Enter the verification code we just emailed to {email}.</div>
            <input placeholder="Verification code" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: "100%", marginBottom: 14 }} />
          </>
        ) : (
          <>
            {mode === "signup" && (
              <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            )}
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginBottom: 14 }} />
          </>
        )}

        {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: 11, borderRadius: 6, border: "none", background: "var(--green)", color: "#04150F", fontWeight: 700 }}>
          {busy ? "Please wait…" : verifying ? "Verify" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </div>
    </div>
  );
}
