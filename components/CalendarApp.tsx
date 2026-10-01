"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POLL_MS, REVIEWERS } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { MixData, Post, Review } from "@/lib/types";
import MixPanel from "./MixPanel";
import PostList from "./PostList";

type Tab = "company" | "founder" | "mix";
const TABS: { id: Tab; label: string }[] = [
  { id: "company", label: "Company page" },
  { id: "founder", label: "Founders" },
  { id: "mix", label: "Monthly content mix" },
];
const NAME_KEY = "amaya-reviewer-name";

type Props = { posts: Post[]; initialReviews: Review[]; mix: MixData; canSignOut: boolean };

export default function CalendarApp({ posts, initialReviews, mix, canSignOut }: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Record<string, Review>>(() => Object.fromEntries(initialReviews.map((r) => [r.postId, r])));
  const [tab, setTab] = useState<Tab>("company");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [reviewerName, setReviewerName] = useState("");
  const [sync, setSync] = useState<{ ok: boolean; at: string }>({ ok: true, at: new Date().toISOString() });
  const dirtyIds = useRef(new Set<string>());

  const company = useMemo(() => posts.filter((p) => p.channel === "company"), [posts]);
  const founder = useMemo(() => posts.filter((p) => p.channel === "founder"), [posts]);

  // Remember who is reviewing on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved && (REVIEWERS as readonly string[]).includes(saved)) setReviewerName(saved);
    } catch {
      /* storage blocked */
    }
  }, []);
  function chooseName(name: string) {
    setReviewerName(name);
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* storage blocked */
    }
  }

  // Deep links: /#CO-W05 or /#founder
  useEffect(() => {
    const applyHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (!h) return;
      if (h === "company" || h === "founder" || h === "mix") return setTab(h);
      const post = posts.find((p) => p.postId === h);
      if (!post) return;
      setTab(post.channel);
      setOpenIds((prev) => new Set(prev).add(post.postId));
      setTimeout(() => document.getElementById(post.postId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [posts]);

  // Pull other reviewers' changes.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews", { cache: "no-store" });
      if (res.status === 401) return router.refresh();
      if (!res.ok) throw new Error();
      const list: Review[] = await res.json();
      setReviews(Object.fromEntries(list.map((r) => [r.postId, r])));
      setSync({ ok: true, at: new Date().toISOString() });
    } catch {
      setSync((s) => ({ ...s, ok: false }));
    }
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Warn before leaving with unsaved reviews.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyIds.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const onSaved = useCallback((postId: string, review: Review | null) => {
    setReviews((prev) => {
      const next = { ...prev };
      if (review) next[postId] = review;
      else delete next[postId];
      return next;
    });
  }, []);
  const onDirtyChange = useCallback((postId: string, dirty: boolean) => {
    if (dirty) dirtyIds.current.add(postId);
    else dirtyIds.current.delete(postId);
  }, []);

  const stats = useMemo(() => {
    const s = { approved: 0, rejected: 0, pending: 0 };
    posts.forEach((p) => s[reviews[p.postId]?.status ?? "pending"]++);
    return s;
  }, [posts, reviews]);
  const pct = (n: number) => `${((n / posts.length) * 100).toFixed(2)}%`;

  function selectTab(id: Tab) {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  }

  async function signOut() {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="bg-navy pt-11 text-mast-text">
        <div className="wrap">
          <div className="eyebrow text-brass-soft">Vera Vita Living · Oct 2026 – Mar 2027</div>
          <h1 className="mt-3 font-serif text-[clamp(40px,6vw,62px)] font-medium leading-none tracking-[-0.01em]">Amaya on LinkedIn</h1>
          <p className="mt-3.5 max-w-[60ch] text-mast-sub">
            The company page and founder calendar for founder sign-off. Open a post, read the brief, then approve it or send it back with feedback.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4 text-[12px] tracking-[0.04em] text-mast-muted">
            <Stat value={posts.length} label="posts to review" className="text-brass-soft" />
            <Stat value={stats.approved} label="approved" className="text-mast-ok" />
            <Stat value={stats.rejected} label="not approved" className="text-mast-no" />
            <Stat value={stats.pending} label="awaiting review" className="text-brass-soft" />
          </div>
          <div className="mt-5 flex h-[3px] max-w-[520px] overflow-hidden bg-navy-track" role="img" aria-label={`${stats.approved} approved, ${stats.rejected} not approved, ${stats.pending} awaiting review`}>
            <span className="bg-mast-ok" style={{ width: pct(stats.approved) }} />
            <span className="bg-mast-no" style={{ width: pct(stats.rejected) }} />
          </div>

          <nav className="mt-8 flex gap-7 overflow-x-auto" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => selectTab(t.id)}
                className={`whitespace-nowrap border-b-2 py-3.5 text-[14.5px] transition-colors ${tab === t.id ? "border-brass text-white" : "border-transparent text-mast-muted hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="wrap pb-20 pt-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2.5">
              <span className="field-label">Reviewing as</span>
              <select id="reviewing-as" className="rounded-sq border border-line bg-white px-2.5 py-1.5 text-ink" value={reviewerName} onChange={(e) => chooseName(e.target.value)}>
                <option value="">Choose your name</option>
                {REVIEWERS.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="flex items-center gap-2 text-muted" role="status">
              <span className={`h-2 w-2 rounded-full ${sync.ok ? "bg-ok-fg" : "bg-no-fg"}`} aria-hidden />
              {sync.ok ? `Live. Updated ${formatTimestamp(sync.at)}` : "Can't reach the server. Retrying…"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a className="btn" href="/api/export?format=xlsx">
              Export to Excel
            </a>
            <a className="btn" href="/api/export?format=csv">
              Export CSV
            </a>
            {canSignOut && (
              <button type="button" className="btn" onClick={signOut}>
                Sign out
              </button>
            )}
          </div>
        </div>

        <div hidden={tab !== "company"}>
          <PostList
            channel="company"
            intro={mix.companyIntro}
            posts={company}
            reviews={reviews}
            reviewerName={reviewerName}
            openIds={openIds}
            setOpenIds={setOpenIds}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        </div>
        <div hidden={tab !== "founder"}>
          <PostList
            channel="founder"
            intro={mix.founderIntro}
            posts={founder}
            reviews={reviews}
            reviewerName={reviewerName}
            openIds={openIds}
            setOpenIds={setOpenIds}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        </div>
        <div hidden={tab !== "mix"}>
          <MixPanel mix={mix} />
        </div>
      </main>
      <footer className="wrap border-t border-line pb-10 pt-6 text-[12.5px] text-muted">Vera Vita Living LLP · Amaya. Prepared by BroaddCast for founder review.</footer>
    </>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div>
      <b className={`mb-1.5 block font-serif text-[36px] font-semibold leading-none tabular-nums ${className}`}>{value}</b>
      {label}
    </div>
  );
}
