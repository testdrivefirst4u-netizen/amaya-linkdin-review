"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/config";
import { displayDate } from "@/lib/format";
import type { Post, Suggestion, SuggestionStatus } from "@/lib/types";
import { SuggestionView } from "../SuggestPanel";

const TABS: { id: SuggestionStatus | "all"; label: string }[] = [
  { id: "open", label: "Waiting" },
  { id: "accepted", label: "Approved" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];

export default function SuggestionQueue({ suggestions, posts }: { suggestions: Suggestion[]; posts: Post[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<SuggestionStatus | "all">("open");
  const postsById = useMemo(() => new Map(posts.map((p) => [p.postId, p])), [posts]);
  const shown = suggestions.filter((s) => tab === "all" || s.status === tab);
  const count = (id: SuggestionStatus | "all") => suggestions.filter((s) => id === "all" || s.status === id).length;

  return (
    <section>
      <p className="mb-5 max-w-[78ch] text-muted">
        Founders&apos; suggested changes wait here. Approving applies the new wording to the post and adds any images; declining leaves the post as it is.
      </p>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? "btn-primary" : ""}`}>
            {t.label} ({count(t.id)})
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-10 text-muted">{tab === "open" ? "Nothing waiting. New suggestions from the founders appear here." : "No suggestions here yet."}</p>
      ) : (
        <ul className="grid gap-4">
          {shown.map((s) => (
            <li key={s.id} id={s.postId}>
              <SuggestionCard s={s} post={postsById.get(s.postId)} onDone={() => router.refresh()} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SuggestionCard({ s, post, onDone }: { s: Suggestion; post?: Post; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(action: "accept" | "decline") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/suggestions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDone();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  return (
    <article className="grid gap-4 border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-x-2.5 text-[12px] text-muted">
            <span className="font-medium text-navy">{s.postId}</span>
            {post && <span>{displayDate(post.date)}</span>}
            {post && <span className="eyebrow text-brass">{post.channel === "company" ? "Company page" : post.founder}</span>}
          </div>
          <h3 className="mt-0.5 font-medium text-navy">{post?.topic ?? "Post deleted"}</h3>
        </div>
        {post && (
          <div className="flex gap-2">
            <a className="btn" href={`/#${s.postId}`}>
              View post
            </a>
            <a className="btn" href={`/admin/posts/${encodeURIComponent(s.postId)}/edit`}>
              Edit post
            </a>
          </div>
        )}
      </div>
      <SuggestionView s={s} post={post} />
      {s.status === "open" && post && (
        <div className="grid gap-3 border-t border-line pt-4">
          <label className="grid gap-1.5">
            <span className="field-label">Note to {s.author.split(" ")[0]} (optional)</span>
            <input className="input" maxLength={LIMITS.message} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Applied, and swapped the cover image." />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => decide("accept")}>
              Approve and apply
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => decide("decline")}>
              Decline
            </button>
            {error && (
              <span className="text-[13px] text-no-fg" role="alert">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
