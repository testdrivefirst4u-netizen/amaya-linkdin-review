"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POLL_MS } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { MixData, PersonReview, Post, Review, SessionUser } from "@/lib/types";
import MixPanel from "./MixPanel";
import PostList from "./PostList";

type Tab = "company" | "founder" | "mix";
const TABS: { id: Tab; label: string }[] = [
  { id: "company", label: "Company page" },
  { id: "founder", label: "Founders" },
  { id: "mix", label: "Monthly content mix" },
];
type Props = {
  posts: Post[];
  postsVersion: string;
  initialReviews: Review[];
  initialPeople: Record<string, PersonReview[]>;
  mix: MixData;
  user: SessionUser;
  openSuggestions: number;
};

export default function CalendarApp({ posts, postsVersion, initialReviews, initialPeople, mix, user, openSuggestions }: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Record<string, Review>>(() => Object.fromEntries(initialReviews.map((r) => [r.postId, r])));
  const [people, setPeople] = useState<Record<string, PersonReview[]>>(initialPeople);
  const [tab, setTab] = useState<Tab>("company");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sync, setSync] = useState<{ ok: boolean; at: string }>({ ok: true, at: new Date().toISOString() });
  const dirtyIds = useRef(new Set<string>());
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const versionRef = useRef(postsVersion);
  versionRef.current = postsVersion;

  const company = useMemo(() => posts.filter((p) => p.channel === "company"), [posts]);
  const founder = useMemo(() => posts.filter((p) => p.channel === "founder"), [posts]);

  // Deep links: /#CO-W05 opens that post's panel; /#founder picks a tab.
  useEffect(() => {
    const applyHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (!h) return setSelectedId(null);
      if (h === "company" || h === "founder" || h === "mix") {
        setSelectedId(null);
        return setTab(h);
      }
      const post = postsRef.current.find((p) => p.postId === h);
      if (!post) return;
      setTab(post.channel);
      setSelectedId(post.postId);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // Pull other reviewers' changes, and reload the posts when the admin adds or edits one.
  const refresh = useCallback(async () => {
    try {
      const [res, ppl, ver] = await Promise.all([
        fetch("/api/reviews", { cache: "no-store" }),
        fetch("/api/reviews/people", { cache: "no-store" }),
        fetch("/api/posts/version", { cache: "no-store" }),
      ]);
      if ([res, ppl, ver].some((r) => r.status === 401)) return router.refresh();
      if (!res.ok || !ppl.ok || !ver.ok) throw new Error();
      setPeople(await ppl.json());
      if ((await ver.json()).version !== versionRef.current) router.refresh();
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

  const onSaved = useCallback((postId: string, review: Review | null, list: PersonReview[] | null) => {
    setReviews((prev) => {
      const next = { ...prev };
      if (review) next[postId] = review;
      else delete next[postId];
      return next;
    });
    setPeople((prev) => {
      const next = { ...prev };
      if (list?.length) next[postId] = list;
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

  const isDirty = useCallback((postId: string) => dirtyIds.current.has(postId), []);

  // Opening a post adds it to the address (so Back closes it and links can be shared).
  const selectPost = useCallback((postId: string | null) => {
    const prev = selectedRef.current;
    setSelectedId(postId);
    if (postId) {
      if (prev) history.replaceState(null, "", `#${postId}`);
      else history.pushState(null, "", `#${postId}`);
    } else {
      const ch = postsRef.current.find((p) => p.postId === prev)?.channel ?? "company";
      history.replaceState(null, "", `#${ch}`);
      if (prev) setTimeout(() => document.getElementById(prev)?.scrollIntoView({ block: "nearest" }), 30);
    }
  }, []);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

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
            <span className="flex items-center gap-2.5">
              <span className="field-label">Signed in as</span>
              <b className="font-medium text-navy">{user.name}</b>
              {user.role === "admin" && <span className="rounded-sq bg-navy px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-white">Admin</span>}
            </span>
            <span className="flex items-center gap-2 text-muted" role="status">
              <span className={`h-2 w-2 rounded-full ${sync.ok ? "bg-ok-fg" : "bg-no-fg"}`} aria-hidden />
              {sync.ok ? `Live. Updated ${formatTimestamp(sync.at)}` : "Can't reach the server. Retrying…"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.role === "admin" && (
              <>
                <a className="btn btn-primary" href="/admin/posts/new">
                  New post
                </a>
                <a className="btn" href="/admin">
                  Admin area
                </a>
                <a className="btn" href="/admin/reviews">
                  Founder reviews
                </a>
                <a className="btn" href="/admin/suggestions">
                  Suggestions to approve{openSuggestions ? ` (${openSuggestions})` : ""}
                </a>
              </>
            )}
            <a className="btn" href="/api/export?format=xlsx">
              Export to Excel
            </a>
            <a className="btn" href="/api/export?format=csv">
              Export CSV
            </a>
            <button type="button" className="btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>

        <div hidden={tab !== "company"}>
          <PostList
            channel="company"
            intro={mix.companyIntro}
            posts={company}
            reviews={reviews}
            people={people}
            user={user}
            selectedId={selectedId}
            onSelect={selectPost}
            isDirty={isDirty}
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
            people={people}
            user={user}
            selectedId={selectedId}
            onSelect={selectPost}
            isDirty={isDirty}
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
