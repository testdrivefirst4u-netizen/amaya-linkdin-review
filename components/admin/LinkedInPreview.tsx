"use client";

import { useState } from "react";
import { COMPANY_NAME } from "@/lib/config";
import { paragraphs, postText } from "@/lib/format";
import { thumb } from "@/lib/images";
import type { Post } from "@/lib/types";

/** Roughly how the post reads in the LinkedIn feed: author, copy with "…see more", and the image grid. */
export default function LinkedInPreview({ post }: { post: Post }) {
  const [more, setMore] = useState(false);
  const author = post.channel === "company" ? COMPANY_NAME : post.founder || "Founder";
  const subtitle = post.channel === "company" ? "Company page · Senior living" : "Co-founder, Amaya by Vera Vita";
  const initials = author
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const body = paragraphs(postText(post));
  const long = postText(post).length > 210;
  const images = post.images ?? [];

  return (
    <div className="overflow-hidden rounded-[8px] border border-line bg-white shadow-[0_1px_2px_rgba(27,42,65,0.06)]">
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center text-[14px] font-semibold text-white ${post.channel === "company" ? "rounded-sq bg-navy" : "rounded-full bg-brass"}`}>
          {initials}
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[14px] font-semibold text-ink">{author}</div>
          <div className="truncate text-[12px] text-muted">{subtitle}</div>
          <div className="text-[12px] text-muted">Scheduled · 🌐</div>
        </div>
      </div>
      <div className={`relative px-4 pb-3 pt-2.5 text-[14px] leading-[1.45] text-ink ${!more && long ? "max-h-[84px] overflow-hidden" : ""}`}>
        {body.length ? (
          body.map((p, i) => (
            <p key={i} className="mb-2 whitespace-pre-line last:mb-0">
              {p}
            </p>
          ))
        ) : (
          <p className="text-muted">Your post copy appears here.</p>
        )}
      </div>
      {long && (
        <button type="button" className="-mt-2 mb-2 px-4 text-[13px] font-medium text-muted hover:text-navy" onClick={() => setMore((m) => !m)}>
          {more ? "…see less" : "…see more"}
        </button>
      )}
      {images.length > 0 && <ImageGrid urls={images.map((i) => i.url)} />}
      <div className="flex justify-around border-t border-line px-2 py-1.5 text-[12.5px] font-medium text-muted">
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
    </div>
  );
}

function ImageGrid({ urls }: { urls: string[] }) {
  /* eslint-disable @next/next/no-img-element */
  if (urls.length === 1) return <img src={thumb(urls[0], 1100)} alt="" className="block max-h-[520px] w-full object-cover" />;
  if (urls.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {urls.map((u) => (
          <img key={u} src={thumb(u, 560, 560)} alt="" className="aspect-square w-full object-cover" />
        ))}
      </div>
    );
  }
  const rest = urls.slice(1, 4);
  return (
    <div className="grid gap-0.5">
      <img src={thumb(urls[0], 1100, 620)} alt="" className="aspect-[16/9] w-full object-cover" />
      <div className={`grid gap-0.5 ${rest.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {rest.map((u, i) => (
          <div key={u} className="relative">
            <img src={thumb(u, 400, 400)} alt="" className="aspect-square w-full object-cover" />
            {i === rest.length - 1 && urls.length > 4 && (
              <span className="absolute inset-0 flex items-center justify-center bg-navy/55 text-[22px] font-semibold text-white">+{urls.length - 4}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}
