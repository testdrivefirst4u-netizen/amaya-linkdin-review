"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FOUNDERS, STATUS_LABEL, STATUS_ORDER } from "@/lib/config";
import { displayDate, formatTimestamp } from "@/lib/format";
import type { PersonReview, Post, Review, ReviewStatus } from "@/lib/types";
import { PostImagesManager, RowThumb } from "../Images";
import { StatusChip } from "../ui";
import { VerdictPills } from "./FounderVerdicts";

const selectCls = "max-w-full rounded-sq border border-line bg-white px-3 py-2.5 text-[14px]";

type Props = { posts: Post[]; reviews: Review[]; byPerson: Record<string, PersonReview[]> };

export default function AdminPosts({ posts, reviews, byPerson }: Props) {
  const router = useRouter();
  const byId = useMemo(() => new Map(reviews.map((r) => [r.postId, r])), [reviews]);
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [imagesFor, setImagesFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...posts]
      .sort((a, b) => a.date.localeCompare(b.date) || a.postId.localeCompare(b.postId))
      .filter((p) => {
        if (owner === "company" && p.channel !== "company") return false;
        if (owner && owner !== "company" && p.founder !== owner) return false;
        if (status && (byId.get(p.postId)?.status ?? "pending") !== status) return false;
        if (needle && ![p.postId, p.topic, p.hook, p.pillar, p.founder].join(" ").toLowerCase().includes(needle)) return false;
        return true;
      });
  }, [posts, q, owner, status, byId]);

  const withImages = posts.filter((p) => p.images?.length).length;
  const counts = useMemo(() => {
    const c: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    posts.forEach((p) => c[byId.get(p.postId)?.status ?? "pending"]++);
    return c;
  }, [posts, byId]);

  async function remove(postId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfirm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't delete the post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-muted">
          {posts.length} posts · {withImages} with images. Create, edit and add images here. Founders review each post on the calendar.
        </p>
        <Link className="btn btn-primary" href="/admin/posts/new">
          New post
        </Link>
      </div>

      <span className="field-label mb-2 block">Overall status · click to filter</span>
      <div className="mb-5 grid grid-cols-3 gap-2 sm:max-w-[560px]">
        {STATUS_ORDER.map((st) => (
          <button
            key={st}
            type="button"
            aria-pressed={status === st}
            onClick={() => setStatus(status === st ? "" : st)}
            className={`border px-3 py-2.5 text-left transition-colors ${status === st ? "border-navy bg-navy text-white" : "border-line bg-white hover:bg-brass-wash"}`}
          >
            <b className="block font-serif text-[28px] font-semibold leading-none tabular-nums">{counts[st]}</b>
            <span className={`text-[12px] ${status === st ? "text-mast-sub" : "text-muted"}`}>{STATUS_LABEL[st]}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2.5 border-b border-line pb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ID, topic or hook…"
          aria-label="Search posts"
          className="min-w-0 flex-[1_1_220px] rounded-sq border border-line bg-white px-3.5 py-2.5 text-[14px]"
        />
        <select aria-label="Filter by channel" className={selectCls} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">All pages and founders</option>
          <option value="company">Company page</option>
          {FOUNDERS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <span className="text-[13px] text-muted md:ml-auto">
          {shown.length} of {posts.length}
        </span>
      </div>
      {error && (
        <p className="mb-3 text-sm text-no-fg" role="alert">
          {error}
        </p>
      )}

      <ul className="grid gap-2">
        {shown.map((p) => (
          <li key={p.postId} className="grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-2 border border-line bg-white px-4 py-3 md:grid-cols-[84px_1fr_auto]">
            <RowThumb images={p.images} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 text-[12px] text-muted">
                <span className="font-medium text-navy">{p.postId}</span>
                <span>{displayDate(p.date)}</span>
                <span className="eyebrow text-brass">{p.channel === "company" ? "Company page" : p.founder}</span>
                {p.origin === "app" && <span>· Created by {p.createdBy}</span>}
              </div>
              <p className="mt-0.5 truncate font-medium text-navy">{p.topic}</p>
              <ReviewLine review={byId.get(p.postId)} people={byPerson[p.postId]} />
            </div>
            <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1">
              {confirm === p.postId ? (
                <>
                  <span className="self-center text-[13px] text-cond-fg">Delete post, review and images?</span>
                  <button type="button" className="btn border-cond-fg text-cond-fg" disabled={busy} onClick={() => remove(p.postId)}>
                    Delete
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirm(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <a className="btn" href={`/#${p.postId}`}>
                    View
                  </a>
                  <button type="button" className={`btn ${imagesFor === p.postId ? "btn-primary" : ""}`} aria-expanded={imagesFor === p.postId} onClick={() => setImagesFor(imagesFor === p.postId ? null : p.postId)}>
                    {p.images?.length ? `Images (${p.images.length})` : "Add images"}
                  </button>
                  <Link className="btn" href={`/admin/posts/${encodeURIComponent(p.postId)}/edit`}>
                    Edit
                  </Link>
                  <button type="button" className="btn" onClick={() => setConfirm(p.postId)}>
                    Delete
                  </button>
                </>
              )}
            </div>
            {imagesFor === p.postId && (
              <div className="col-span-full">
                <PostImagesManager postId={p.postId} images={p.images ?? []} onSaved={() => router.refresh()} onClose={() => setImagesFor(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewLine({ review, people }: { review?: Review; people?: PersonReview[] }) {
  return (
    <div className="mt-1.5 grid gap-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
        <span className="font-medium text-navy">Overall:</span>
        <StatusChip status={review?.status ?? "pending"} />
        {review?.reviewer && review.status !== "pending" && (
          <span>
            last saved by <b className="font-medium text-body">{review.reviewer}</b> · {formatTimestamp(review.updatedAt)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
        <span className="font-medium text-navy">Founders:</span>
        <VerdictPills list={people} />
      </div>
      {review?.feedback && (
        <p className="line-clamp-2 max-w-[80ch] text-[13px] text-body">
          <span className="font-medium text-navy">Feedback ({review.reviewer.split(" ")[0]}): </span>
          {review.feedback}
        </p>
      )}
    </div>
  );
}
