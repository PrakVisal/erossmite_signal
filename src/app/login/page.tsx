"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const j = await r.json().catch(() => null);
      setError(j?.error ?? "Login failed");
    } catch {
      setError("Network error, try again");
    }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="9" width="4" height="9" rx="1" fill="#2ebd85" />
          <rect x="10" y="4" width="4" height="12" rx="1" fill="#e8b84a" />
          <rect x="17" y="7" width="4" height="10" rx="1" fill="#f6465d" />
        </svg>
        <h1>XAU/USD Signals</h1>
        <p className="muted">Private dashboard. Enter your password.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="banner err">{error}</div>}
        <button className="btn gold" disabled={busy || !password}>{busy ? "Checking…" : "Sign in"}</button>
      </form>
    </div>
  );
}
