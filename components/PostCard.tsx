"use client";

import { useEffect, useState } from "react";
import { paragraphs, postText } from "@/lib/format";
import type { PersonReview, Post, PostImage, Review, SessionUser } from "@/lib/types";
import { Gallery, PostImagesManager } from "./Images";
import ReviewPanel from "./ReviewPanel";
import SuggestPanel from "./SuggestPanel";
import { CopyButton } from "./ui";

type Props = {
  post: Post;
  review?: Review;
  people?: PersonReview[];
  user: SessionUser;
  onSaved: (postId: string, review: Review | null, people: PersonReview[] | null) => void;
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

/** Everything about one post: images, copy, brief, the reviewer's own review and suggestions. Shown in the side panel. */
export function PostDetail({ post, review, people, user, onSaved, onDirtyChange }: Props) {
  // Images saved here show straight away, without reloading the calendar.
  const [savedImages, setSavedImages] = useState<PostImage[] | null>(null);
  const [managing, setManaging] = useState(false);
  useEffect(() => setSavedImages(null), [post.images]);
  const p = savedImages ? { ...post, images: savedImages } : post;
  const images = p.images ?? [];

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        {managing ? (
          <div className="mb-6">
            <PostImagesManager postId={p.postId} images={images} onSaved={setSavedImages} onClose={() => setManaging(false)} />
          </div>
        ) : images.length > 0 ? (
          <div className="mb-6">
            <Gallery images={images} />
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sq border border-dashed border-line px-4 py-3.5 text-[13px] text-muted">
            No image on this post yet.
            {user.role === "admin" && (
              <button type="button" className="btn px-3 py-1.5 text-[12.5px]" onClick={() => setManaging(true)}>
                Add images
              </button>
            )}
          </div>
        )}
        {p.channel === "company" && p.headline && <p className="font-serif text-[27px] font-semibold leading-[1.15] text-navy">{p.headline}</p>}
        <div className={`flex flex-wrap items-center justify-between gap-3 ${p.channel === "company" && p.headline ? "mt-4" : ""}`}>
          <span className="field-label">LinkedIn post copy</span>
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" && !managing && images.length > 0 && (
              <button type="button" className="btn px-3 py-1.5 text-[12.5px]" onClick={() => setManaging(true)}>
                Manage images
              </button>
            )}
            {user.role === "admin" && (
              <a className="btn px-3 py-1.5 text-[12.5px]" href={`/admin/posts/${encodeURIComponent(p.postId)}/edit`}>
                Edit post
              </a>
            )}
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

      <div className="grid min-w-0 content-start gap-5">
        <ReviewPanel post={p} review={review} people={people} user={user} onSaved={onSaved} onDirtyChange={onDirtyChange} />
        <SuggestPanel post={p} user={user} />
      </div>
    </div>
  );
}
