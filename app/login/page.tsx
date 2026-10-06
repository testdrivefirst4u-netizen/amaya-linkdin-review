"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError((await res.json()).error || "That username or password isn't right.");
        return;
      }
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="field-label">Username</span>
        <input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Password</span>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="text-sm text-no-fg" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary" disabled={busy || !username || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-navy px-4 py-24">
      <div className="mx-auto max-w-sm border-t-2 border-brass bg-paper p-8">
        <div className="eyebrow text-brass">Vera Vita Living · Founder review</div>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-navy">Amaya on LinkedIn</h1>
        <p className="mb-6 mt-2 text-sm text-muted">Sign in with the username and password BroaddCast sent you.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
