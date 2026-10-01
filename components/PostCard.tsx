"use client";

import { memo } from "react";
import { FOUNDER_DOT } from "@/lib/config";
import { paragraphs, parts, postText } from "@/lib/format";
import type { Post, Review } from "@/lib/types";
import ReviewPanel from "./ReviewPanel";
import { Chevron, CopyButton, SourceBadge, StatusChip } from "./ui";

type Props = {
  post: Post;
  review?: Review;
  open: boolean;
  reviewerName: string;
  onToggle: (postId: string) => void;
  onSaved: (postId: string, review: Review | null) => void;
  onDirtyChange: (postId: string, dirty: boolean) => void;
};

function Brief({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-body">{children}</dd>
    </>
  );
}

function PostCard({ post: p, review, open, reviewerName, onToggle, onSaved, onDirtyChange }: Props) {
  const d = parts(p.date);
  const status = review?.status ?? "pending";

  return (
    <article id={p.postId} className="scroll-mt-24 border border-line bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(p.postId)}
        className="grid w-full cursor-pointer grid-cols-[60px_1fr] items-center gap-x-4 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-brass-wash/60 sm:px-5 md:grid-cols-[86px_1fr_auto] md:gap-x-5"
      >
        <div className="self-start text-[12px] leading-tight text-muted md:self-center">
          <b className="block font-serif text-[26px] font-semibold leading-none text-navy tabular-nums">{String(d.day).padStart(2, "0")}</b>
          <span className="mt-1 block">
            {d.weekday} · {p.channel === "company" ? `W${p.week}` : d.monthShort}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {p.channel === "company" ? (
              <span className="eyebrow text-brass">{p.pillar}</span>
            ) : (
              <>
                <span className={`h-2 w-2 rounded-full ${FOUNDER_DOT[p.founder ?? ""] ?? "bg-brass"}`} aria-hidden />
                <span className="eyebrow text-brass">
                  {p.founder} · {p.focus}
                </span>
              </>
            )}
            <span className="text-[11.5px] text-muted/80">{p.postId}</span>
          </div>
          <h3 className="mt-1 text-[16.5px] font-medium leading-snug text-navy">{p.topic}</h3>
          {!open && <p className="mt-1 line-clamp-2 max-w-[80ch] text-[14px] text-muted">{p.hook}</p>}
        </div>
        <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto md:flex-col md:items-end">
          <StatusChip status={status} />
          <SourceBadge type={p.sourceType} />
          <span className="ml-auto md:ml-0">
            <Chevron open={open} />
          </span>
        </div>
      </button>

      {open && (
        <div className="mx-4 grid gap-7 border-t border-line pb-6 pt-5 sm:mx-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {p.channel === "company" && p.headline && (
              <p className="font-serif text-[27px] font-semibold leading-[1.15] text-navy">{p.headline}</p>
            )}
            <div className={`flex flex-wrap items-center justify-between gap-3 ${p.channel === "company" && p.headline ? "mt-4" : ""}`}>
              <span className="field-label">LinkedIn post copy</span>
              <div className="flex gap-2">
                <CopyButton label="Copy link" doneLabel="Link copied" text={() => `${window.location.origin}/#${p.postId}`} />
                <CopyButton label="Copy post" text={() => postText(p)} />
              </div>
            </div>
            <div className="mt-3 text-body">
              {paragraphs(p.copy).map((para, i) => (
                <p key={i} className="mb-3 max-w-[68ch]">
                  {para}
                </p>
              ))}
            </div>
            {p.cta && <p className="border-l-2 border-brass pl-3 italic text-navy">{p.cta}</p>}
            <div className="mt-3 text-[13.5px] text-slate">{p.hashtags}</div>

            <dl className="mt-6 grid gap-x-5 gap-y-2.5 border-t border-line pt-5 text-[13.5px] sm:grid-cols-[150px_1fr]">
              {p.channel === "company" ? (
                <>
                  <Brief label="Objective">{p.objective}</Brief>
                  <Brief label="Audience">{p.audience}</Brief>
                  <Brief label="Format">{p.format}</Brief>
                  <Brief label="Creative direction">{p.creative}</Brief>
                  <Brief label="Suggested visual">{p.visual}</Brief>
                  <Brief label="Source">{p.source}</Brief>
                </>
              ) : (
                <>
                  <Brief label="Angle">{p.angle}</Brief>
                  <Brief label="Audience">{p.audience}</Brief>
                  <Brief label="Image or video">{p.visual}</Brief>
                  <Brief label="Source">{p.source}</Brief>
                </>
              )}
            </dl>
            {p.sourceType === "conditional" && (
              <div className="mt-5 border-l-2 border-cond-fg bg-cond-bg px-3.5 py-2.5 text-[13.5px] text-cond-fg">
                <b className="font-medium">Hold this post</b> until the client confirms readiness. Don&apos;t publish on the fixed date if the site hasn&apos;t caught up.
              </div>
            )}
            {p.sourceType === "fact" && (
              <div className="mt-5 border-l-2 border-brass bg-brass-wash px-3.5 py-2.5 text-[13.5px] text-fact-fg">
                <b className="font-medium">Facts to verify.</b> Check the figures against the cited source and get approval on any photography before publishing.
              </div>
            )}
          </div>

          <ReviewPanel post={p} review={review} reviewerName={reviewerName} onSaved={onSaved} onDirtyChange={onDirtyChange} />
        </div>
      )}
    </article>
  );
}

export default memo(PostCard);
