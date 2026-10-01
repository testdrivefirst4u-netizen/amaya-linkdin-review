"use client";

import { useMemo, useState } from "react";
import { SOURCE_LABEL } from "@/lib/config";
import { groupByMonth } from "@/lib/format";
import type { Channel, Post, Review, ReviewStatus, SourceType } from "@/lib/types";
import PostCard from "./PostCard";

type Props = {
  channel: Channel;
  intro: string;
  posts: Post[];
  reviews: Record<string, Review>;
  reviewerName: string;
  openIds: Set<string>;
  setOpenIds: (fn: (prev: Set<string>) => Set<string>) => void;
  onSaved: (postId: string, review: Review | null) => void;
  onDirtyChange: (postId: string, dirty: boolean) => void;
};

const selectCls = "max-w-full rounded-sq border border-line bg-white px-3 py-2.5 text-[14px]";

export default function PostList({ channel, intro, posts, reviews, reviewerName, openIds, setOpenIds, onSaved, onDirtyChange }: Props) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [source, setSource] = useState<SourceType | "">("");
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const key = channel === "company" ? "pillar" : "founder";
  const p = channel === "company" ? "co" : "fo";

  const groupOptions = useMemo(() => [...new Set(posts.map((x) => x[key] ?? ""))].filter(Boolean).sort(), [posts, key]);
  const sourceOptions = useMemo(() => (Object.keys(SOURCE_LABEL) as SourceType[]).filter((s) => posts.some((x) => x.sourceType === s)), [posts]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((x) => {
      if (group && x[key] !== group) return false;
      if (source && x.sourceType !== source) return false;
      const rv = reviews[x.postId];
      if (status && (rv?.status ?? "pending") !== status) return false;
      if (needle) {
        const hay = [x.postId, x.topic, x.hook, x.copy, x.pillar, x.founder, x.focus, x.hashtags, x.audience, rv?.feedback, rv?.remarks, rv?.reviewer]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [posts, reviews, q, group, source, status, key]);

  const allOpen = shown.length > 0 && shown.every((x) => openIds.has(x.postId));
  const filtered = q || group || source || status;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setOpenIds((prev) => {
      const n = new Set(prev);
      shown.forEach((x) => (allOpen ? n.delete(x.postId) : n.add(x.postId)));
      return n;
    });
  }

  return (
    <section>
      <p className="mb-5 max-w-[78ch] text-muted">{intro}</p>
      <div className="z-10 mb-2 flex flex-wrap items-center gap-2.5 border-b border-line bg-paper py-3 md:sticky md:top-0">
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
        <select id={`${p}-status`} aria-label="Filter by review status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus | "")}>
          <option value="">All review statuses</option>
          <option value="pending">Awaiting review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Not approved</option>
        </select>
        <button type="button" className="btn py-2.5" onClick={toggleAll} disabled={!shown.length}>
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
        {filtered && (
          <button
            type="button"
            className="text-[13px] font-medium text-brass-dark underline-offset-4 hover:underline"
            onClick={() => {
              setQ("");
              setGroup("");
              setSource("");
              setStatus("");
            }}
          >
            Clear filters
          </button>
        )}
        <span className="w-full text-[13px] text-muted md:ml-auto md:w-auto">
          {shown.length} of {posts.length} posts
        </span>
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
            {g.posts.map((x) => (
              <PostCard
                key={x.postId}
                post={x}
                review={reviews[x.postId]}
                open={openIds.has(x.postId)}
                reviewerName={reviewerName}
                onToggle={toggle}
                onSaved={onSaved}
                onDirtyChange={onDirtyChange}
              />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
