"use client";

import { useMemo, useState } from "react";
import { SOURCE_LABEL } from "@/lib/config";
import { groupByMonth } from "@/lib/format";
import type { Channel, PersonReview, Post, Review, ReviewStatus, SessionUser, SourceType } from "@/lib/types";
import PostDrawer from "./PostDrawer";
import PostTile from "./PostTile";

type Props = {
  channel: Channel;
  intro: string;
  posts: Post[];
  reviews: Record<string, Review>;
  people: Record<string, PersonReview[]>;
  user: SessionUser;
  selectedId: string | null;
  onSelect: (postId: string | null) => void;
  isDirty: (postId: string) => boolean;
  onSaved: (postId: string, review: Review | null, people: PersonReview[] | null) => void;
  onDirtyChange: (postId: string, dirty: boolean) => void;
};

const selectCls = "max-w-full rounded-sq border border-line bg-white px-3 py-2.5 text-[14px]";
type Quick = "" | "mine" | ReviewStatus;

/** Image grid of posts by month (layout C). Opening a tile shows the post in a side panel. */
export default function PostList({ channel, intro, posts, reviews, people, user, selectedId, onSelect, isDirty, onSaved, onDirtyChange }: Props) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [source, setSource] = useState<SourceType | "">("");
  const [quick, setQuick] = useState<Quick>("");
  const key = channel === "company" ? "pillar" : "founder";
  const p = channel === "company" ? "co" : "fo";

  const groupOptions = useMemo(() => [...new Set(posts.map((x) => x[key] ?? ""))].filter(Boolean).sort(), [posts, key]);
  const sourceOptions = useMemo(() => (Object.keys(SOURCE_LABEL) as SourceType[]).filter((s) => posts.some((x) => x.sourceType === s)), [posts]);

  const reviewedByMe = (id: string) => people[id]?.some((r) => r.reviewer === user.name && r.status !== "pending");
  const statusOf = (id: string): ReviewStatus => reviews[id]?.status ?? "pending";

  const counts = useMemo(() => {
    const c = { mine: 0, pending: 0, approved: 0, rejected: 0 };
    posts.forEach((x) => {
      c[statusOf(x.postId)]++;
      if (!reviewedByMe(x.postId)) c.mine++;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, reviews, people]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((x) => {
      if (group && x[key] !== group) return false;
      if (source && x.sourceType !== source) return false;
      if (quick === "mine" && reviewedByMe(x.postId)) return false;
      if (quick && quick !== "mine" && statusOf(x.postId) !== quick) return false;
      if (needle) {
        const rv = reviews[x.postId];
        const notes = (people[x.postId] ?? []).flatMap((r) => [r.reviewer, r.feedback, r.remarks]);
        const hay = [x.postId, x.topic, x.hook, x.copy, x.pillar, x.founder, x.focus, x.hashtags, x.audience, rv?.feedback, rv?.remarks, ...notes]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, reviews, people, q, group, source, quick, key]);

  const filtered = q || group || source || quick;
  const index = selectedId ? shown.findIndex((x) => x.postId === selectedId) : -1;
  // Keep the panel open even if a filter hides the post (e.g. it just got approved under "Awaiting review").
  const selected = selectedId ? posts.find((x) => x.postId === selectedId) : undefined;

  const quickChips: { id: Quick; label: string; n: number }[] = [
    { id: "", label: "All", n: posts.length },
    { id: "mine", label: "Needs my review", n: counts.mine },
    { id: "pending", label: "Awaiting review", n: counts.pending },
    { id: "approved", label: "Approved", n: counts.approved },
    { id: "rejected", label: "Not approved", n: counts.rejected },
  ];

  return (
    <section>
      <p className="mb-5 max-w-[78ch] text-muted">{intro}</p>

      <div className="z-10 mb-2 grid gap-3 border-b border-line bg-paper py-3 md:sticky md:top-0">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick filters">
          {quickChips.map((c) => (
            <button
              key={c.id || "all"}
              type="button"
              aria-pressed={quick === c.id}
              onClick={() => setQuick(c.id)}
              className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                quick === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-body hover:bg-brass-wash"
              }`}
            >
              {c.label}
              <span className={`ml-1.5 tabular-nums ${quick === c.id ? "text-mast-sub" : "text-muted"}`}>{c.n}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            id={`${p}-q`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics, copy, feedback…"
            aria-label="Search posts"
            className="min-w-0 flex-[1_1_220px] rounded-sq border border-line bg-white px-3.5 py-2.5 text-[14px] placeholder:text-muted/80"
          />
          <select id={`${p}-group`} aria-label={channel === "company" ? "Filter by pillar" : "Filter by founder"} className={selectCls} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">{channel === "company" ? "All pillars" : "All founders"}</option>
            {groupOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select id={`${p}-source`} aria-label="Filter by source type" className={selectCls} value={source} onChange={(e) => setSource(e.target.value as SourceType | "")}>
            <option value="">All source types</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              className="text-[13px] font-medium text-brass-dark underline-offset-4 hover:underline"
              onClick={() => {
                setQ("");
                setGroup("");
                setSource("");
                setQuick("");
              }}
            >
              Clear filters
            </button>
          )}
          <span className="w-full text-[13px] text-muted md:ml-auto md:w-auto">
            {shown.length} of {posts.length} posts
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-muted">No posts match these filters. Clear the search or pick a different filter.</p>
      ) : (
        groupByMonth(shown).map((g) => (
          <div key={g.label} className="mt-9 grid gap-3">
            <h2 className="flex flex-wrap items-baseline gap-x-3 font-serif text-[28px] font-semibold leading-tight text-navy">
              {g.label}
              <span className="font-sans text-[12.5px] font-normal text-muted">
                {g.posts.length} post{g.posts.length > 1 ? "s" : ""}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.posts.map((x) => (
                <PostTile key={x.postId} post={x} status={statusOf(x.postId)} people={people[x.postId]} selected={x.postId === selectedId} onOpen={onSelect} />
              ))}
            </div>
          </div>
        ))
      )}

      {selected && (
        <PostDrawer
          post={selected}
          review={reviews[selected.postId]}
          people={people[selected.postId]}
          user={user}
          index={index >= 0 ? index : 0}
          total={index >= 0 ? shown.length : posts.length}
          onPrev={index > 0 ? () => onSelect(shown[index - 1].postId) : undefined}
          onNext={index >= 0 && index < shown.length - 1 ? () => onSelect(shown[index + 1].postId) : undefined}
          onClose={() => onSelect(null)}
          isDirty={isDirty}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      )}
    </section>
  );
}
