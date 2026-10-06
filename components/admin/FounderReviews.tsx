"use client";

import { useMemo, useState } from "react";
import { FOUNDERS } from "@/lib/config";
import { displayDate } from "@/lib/format";
import type { PersonReview, Post } from "@/lib/types";
import { VERDICT, VerdictCell, verdictKey } from "./FounderVerdicts";

type Show = "" | "approved" | "rejected" | "none";
const selectCls = "max-w-full rounded-sq border border-line bg-white px-3 py-2.5 text-[14px]";

/** Every post with each founder's own decision side by side. */
export default function FounderReviews({ posts, byPerson }: { posts: Post[]; byPerson: Record<string, PersonReview[]> }) {
  const [person, setPerson] = useState<string>("");
  const [show, setShow] = useState<Show>("");
  const [q, setQ] = useState("");

  const verdict = (postId: string, name: string) => byPerson[postId]?.find((r) => r.reviewer === name);

  const summary = useMemo(
    () =>
      FOUNDERS.map((name) => {
        const c = { approved: 0, rejected: 0, none: 0 };
        posts.forEach((p) => c[verdictKey(verdict(p.postId, name))]++);
        return { name, ...c };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts, byPerson],
  );

  const columns = person ? [person] : [...FOUNDERS];
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...posts]
      .sort((a, b) => a.date.localeCompare(b.date) || a.postId.localeCompare(b.postId))
      .filter((p) => {
        if (needle && ![p.postId, p.topic, p.pillar, p.founder].join(" ").toLowerCase().includes(needle)) return false;
        if (!show) return true;
        // With a founder chosen, filter on their decision; otherwise on anyone's.
        return columns.some((name) => verdictKey(verdict(p.postId, name)) === show);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, byPerson, q, show, person]);

  return (
    <section>
      <p className="mb-5 max-w-[80ch] text-muted">
        What each founder decided on each post, with their feedback. The calendar shows one overall status per post (the last review saved); this page keeps every founder&apos;s own decision.
      </p>

      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {summary.map((s) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={person === s.name}
            onClick={() => setPerson(person === s.name ? "" : s.name)}
            className={`grid gap-2 border p-4 text-left transition-colors ${person === s.name ? "border-navy bg-navy text-white" : "border-line bg-white hover:bg-brass-wash"}`}
          >
            <span className="font-serif text-[21px] font-semibold leading-tight">{s.name}</span>
            <span className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] ${person === s.name ? "text-mast-sub" : "text-muted"}`}>
              <span>
                <b className={person === s.name ? "text-mast-ok" : "text-ok-fg"}>{s.approved}</b> approved
              </span>
              <span>
                <b className={person === s.name ? "text-mast-no" : "text-no-fg"}>{s.rejected}</b> not approved
              </span>
              <span>
                <b>{s.none}</b> not reviewed
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2.5 border-b border-line pb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ID or topic…"
          aria-label="Search posts"
          className="min-w-0 flex-[1_1_220px] rounded-sq border border-line bg-white px-3.5 py-2.5 text-[14px]"
        />
        <select aria-label="Founder" className={selectCls} value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="">All three founders</option>
          {FOUNDERS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select aria-label="Decision" className={selectCls} value={show} onChange={(e) => setShow(e.target.value as Show)}>
          <option value="">Any decision</option>
          <option value="approved">{VERDICT.approved.label}</option>
          <option value="rejected">{VERDICT.rejected.label}</option>
          <option value="none">{VERDICT.none.label}</option>
        </select>
        <span className="text-[13px] text-muted md:ml-auto">
          {shown.length} of {posts.length} posts
        </span>
      </div>

      {/* Header row (desktop) */}
      <div
        className="hidden gap-4 px-4 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted md:grid"
        style={{ gridTemplateColumns: `minmax(0,1.3fr) repeat(${columns.length}, minmax(0,1fr))` }}
      >
        <span>Post</span>
        {columns.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-muted">No posts match these filters.</p>
      ) : (
        <ul className="grid gap-2">
          {shown.map((p) => (
            <li
              key={p.postId}
              className="grid gap-4 border border-line bg-white px-4 py-3.5 md:[grid-template-columns:var(--cols)]"
              style={{ "--cols": `minmax(0,1.3fr) repeat(${columns.length}, minmax(0,1fr))` } as React.CSSProperties}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 text-[12px] text-muted">
                  <span className="font-medium text-navy">{p.postId}</span>
                  <span>{displayDate(p.date)}</span>
                </div>
                <a href={`/#${p.postId}`} className="mt-0.5 block font-medium leading-snug text-navy hover:underline">
                  {p.topic}
                </a>
                <span className="eyebrow mt-1 block text-brass">{p.channel === "company" ? "Company page" : p.founder}</span>
              </div>
              {columns.map((name) => (
                <div key={name} className="grid gap-1">
                  <span className="field-label md:hidden">{name}</span>
                  <VerdictCell review={verdict(p.postId, name)} />
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
