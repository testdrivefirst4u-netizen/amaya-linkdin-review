"use client";

import { memo } from "react";
import { FOUNDERS } from "@/lib/config";
import { parts } from "@/lib/format";
import { thumb } from "@/lib/images";
import type { PersonReview, Post, ReviewStatus } from "@/lib/types";
import { StatusChip } from "./ui";

/** Background for posts without an image yet, coloured by whose post it is. */
const COVER: Record<string, string> = {
  company: "from-navy to-navy-track",
  "Arudradev Rao": "from-brass-dark to-brass",
  "Dhruv Badruka": "from-[#4E6147] to-sage",
  "Tanay Saboo": "from-[#3E5470] to-slate",
};

const MARK: Record<string, { cls: string; label: string }> = {
  approved: { cls: "bg-ok-bg text-ok-fg", label: "approved" },
  rejected: { cls: "bg-no-bg text-no-fg", label: "not approved" },
  none: { cls: "bg-none-bg text-muted", label: "not reviewed" },
};

type Props = {
  post: Post;
  status: ReviewStatus;
  people?: PersonReview[];
  selected: boolean;
  onOpen: (postId: string) => void;
};

/** One post as an image tile: cover image (or a coloured title card), status, and who has reviewed it. */
function PostTile({ post: p, status, people = [], selected, onOpen }: Props) {
  const d = parts(p.date);
  const cover = p.images?.[0];
  const owner = p.channel === "company" ? p.pillar || "Company page" : p.founder || "Founder";
  const byName = new Map(people.map((r) => [r.reviewer, r]));

  return (
    <button
      type="button"
      id={p.postId}
      onClick={() => onOpen(p.postId)}
      aria-label={`${p.postId}, ${p.topic}. ${d.weekday} ${d.day} ${d.monthShort}.`}
      className={`group grid scroll-mt-24 content-start overflow-hidden rounded-[6px] border bg-white text-left transition-shadow hover:shadow-[0_2px_10px_rgba(27,42,65,0.12)] ${
        selected ? "border-brass ring-2 ring-brass" : "border-line"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-limestone">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(cover.url, 480, 480)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className={`flex h-full w-full flex-col justify-end gap-1.5 bg-gradient-to-br px-3.5 pb-3.5 pt-11 ${COVER[p.channel === "company" ? "company" : p.founder ?? ""] ?? COVER.company}`}>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">{owner}</span>
            <span className="line-clamp-3 font-serif text-[clamp(16px,2vw,21px)] font-semibold leading-[1.1] text-[#FBF6EC]">{p.headline || p.topic}</span>
            <span className="text-[11px] text-white/60">No image yet</span>
          </div>
        )}
        <span className="absolute left-2 top-2">
          <StatusChip status={status} />
        </span>
        <span className="absolute right-2 top-2 flex gap-1">
          {p.origin === "app" && status === "pending" && (
            <span className="rounded-sq bg-navy px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">New</span>
          )}
          {(p.images?.length ?? 0) > 1 && (
            <span className="rounded-sq bg-navy/85 px-1.5 py-0.5 text-[10.5px] font-medium text-white">+{p.images!.length - 1}</span>
          )}
        </span>
      </div>

      <div className="grid gap-1.5 px-3 py-2.5">
        <span className="line-clamp-2 text-[13.5px] font-medium leading-snug text-navy">{p.topic || "Untitled post"}</span>
        <span className="text-[11.5px] text-muted">
          {p.postId} · {d.weekday} {d.day} {d.monthShort}
          {p.channel === "founder" && p.founder ? ` · ${p.founder.split(" ")[0]}` : ""}
        </span>
        <span className="flex gap-1" aria-label="Founder reviews">
          {FOUNDERS.map((name) => {
            const r = byName.get(name);
            const m = MARK[r && r.status !== "pending" ? r.status : "none"];
            return (
              <span key={name} title={`${name}: ${m.label}`} className={`flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold ${m.cls}`}>
                {name[0]}
                <span className="sr-only">
                  {" "}
                  {name} {m.label}
                </span>
              </span>
            );
          })}
        </span>
      </div>
    </button>
  );
}

export default memo(PostTile);
