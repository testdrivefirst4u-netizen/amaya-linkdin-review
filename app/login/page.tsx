"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [code, setCode] = useState("");
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
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError((await res.json()).error || "That access code isn't right.");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
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
        <span className="field-label">Access code</span>
        <input
          id="code"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-no-fg">{error}</p>}
      <button className="btn btn-primary" disabled={busy || !code}>
        {busy ? "Checking…" : "Open calendar"}
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
        <p className="mb-6 mt-2 text-sm text-muted">Enter the access code BroaddCast shared with you to review the calendar.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
