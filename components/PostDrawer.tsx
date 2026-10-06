"use client";

import { useEffect, useRef, useState } from "react";
import { FOUNDER_DOT } from "@/lib/config";
import { parts } from "@/lib/format";
import type { PersonReview, Post, Review, SessionUser } from "@/lib/types";
import { PostDetail } from "./PostCard";
import { SourceBadge, StatusChip } from "./ui";

type Props = {
  post: Post;
  review?: Review;
  people?: PersonReview[];
  user: SessionUser;
  /** Position in the posts currently shown, for "3 of 26". */
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  isDirty: (postId: string) => boolean;
  onSaved: (postId: string, review: Review | null, people: PersonReview[] | null) => void;
  onDirtyChange: (postId: string, dirty: boolean) => void;
};

/** Side panel that opens over the grid with the full post, review and suggestions. */
export default function PostDrawer({ post: p, review, people, user, index, total, onPrev, onNext, onClose, isDirty, onSaved, onDirtyChange }: Props) {
  const d = parts(p.date);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Ask before leaving a post with an unsaved review.
  const guard = (go?: () => void) => {
    if (!go) return;
    if (isDirty(p.postId)) setPending(() => go);
    else go();
  };

  useEffect(() => {
    setPending(null);
    panelRef.current?.scrollTo({ top: 0 });
  }, [p.postId]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape" && !document.querySelector('[aria-label="Image viewer"]')) guard(onClose);
      if (typing || document.querySelector('[aria-label="Image viewer"]')) return;
      if (e.key === "ArrowLeft") guard(onPrev);
      if (e.key === "ArrowRight") guard(onNext);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button type="button" aria-label="Close post" tabIndex={-1} className="absolute inset-0 bg-navy/40" onClick={() => guard(onClose)} />
      <div ref={panelRef} className="relative h-full w-full max-w-[1040px] overflow-y-auto bg-paper shadow-[-8px_0_30px_rgba(27,42,65,0.18)]">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button ref={closeRef} type="button" className="btn px-3 py-1.5" onClick={() => guard(onClose)}>
              ✕ Close
            </button>
            <div className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
              <span className="tabular-nums">
                {index + 1} of {total}
              </span>
              <button type="button" className="btn px-2.5 py-1.5" aria-label="Previous post" disabled={!onPrev} onClick={() => guard(onPrev)}>
                ←
              </button>
              <button type="button" className="btn px-2.5 py-1.5" aria-label="Next post" disabled={!onNext} onClick={() => guard(onNext)}>
                →
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {p.channel === "company" ? (
              <span className="eyebrow text-brass">{p.pillar}</span>
            ) : (
              <>
                <span className={`h-2 w-2 rounded-full ${FOUNDER_DOT[p.founder ?? ""] ?? "bg-brass"}`} aria-hidden />
                <span className="eyebrow text-brass">
                  {p.founder}
                  {p.focus ? ` · ${p.focus}` : ""}
                </span>
              </>
            )}
            <span className="text-[12px] text-muted">
              {p.postId} · {d.weekday} {d.day} {d.monthShort} {p.date.slice(0, 4)}
              {p.channel === "company" && p.week ? ` · Week ${p.week}` : ""}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
            <h2 id="drawer-title" className="max-w-[60ch] text-[19px] font-medium leading-snug text-navy">
              {p.topic}
            </h2>
            <span className="flex flex-wrap gap-2">
              <StatusChip status={review?.status ?? "pending"} />
              <SourceBadge type={p.sourceType} />
            </span>
          </div>
          {pending && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-l-2 border-cond-fg bg-cond-bg px-3 py-2 text-[13px] text-cond-fg" role="alert">
              <span>You have an unsaved review on this post.</span>
              <button
                type="button"
                className="btn border-cond-fg px-3 py-1 text-cond-fg"
                onClick={() => {
                  const go = pending;
                  setPending(null);
                  onDirtyChange(p.postId, false);
                  go();
                }}
              >
                Leave without saving
              </button>
              <button type="button" className="btn px-3 py-1" onClick={() => setPending(null)}>
                Keep editing
              </button>
            </div>
          )}
        </header>
        <div className="px-4 pb-10 pt-5 sm:px-6">
          <PostDetail key={p.postId} post={p} review={review} people={people} user={user} onSaved={onSaved} onDirtyChange={onDirtyChange} />
        </div>
      </div>
    </div>
  );
}
