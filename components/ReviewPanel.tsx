"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, REVIEWERS, STATUS_LABEL, STATUS_ORDER } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { Post, Review, ReviewHistoryEntry, ReviewInput, ReviewStatus } from "@/lib/types";
import { StatusChip } from "./ui";

type Props = {
  post: Post;
  review?: Review;
  reviewerName: string;
  onSaved: (postId: string, review: Review | null) => void;
  onDirtyChange: (postId: string, dirty: boolean) => void;
};

const SEG_ACTIVE: Record<ReviewStatus, string> = {
  pending: "bg-navy text-white",
  approved: "bg-navy text-white",
  rejected: "bg-no-fg text-white",
};

function fromReview(review: Review | undefined, fallbackReviewer: string): ReviewInput {
  return {
    status: review?.status ?? "pending",
    reviewer: review?.reviewer || fallbackReviewer,
    feedback: review?.feedback ?? "",
    remarks: review?.remarks ?? "",
  };
}

export default function ReviewPanel({ post, review, reviewerName, onSaved, onDirtyChange }: Props) {
  const id = post.postId;
  const [form, setForm] = useState<ReviewInput>(() => fromReview(review, reviewerName));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [history, setHistory] = useState<ReviewHistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const dirtyRef = useRef(false);

  // Pick up other reviewers' saves, unless this person is mid-edit.
  useEffect(() => {
    if (!dirtyRef.current) setForm(fromReview(review, reviewerName));
    if (historyOpen) void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.updatedAt, review?.status]);

  // Prefill "Reviewed by" with the person's chosen name on untouched, unreviewed posts.
  useEffect(() => {
    if (!dirtyRef.current && !review?.reviewer) setForm((f) => ({ ...f, reviewer: reviewerName }));
  }, [reviewerName, review?.reviewer]);

  useEffect(() => () => onDirtyChange(id, false), [id, onDirtyChange]);

  function markDirty(next: boolean) {
    dirtyRef.current = next;
    setDirty(next);
    onDirtyChange(id, next);
  }

  function update<K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    markDirty(true);
    setNote({ text: "Unsaved changes" });
  }

  async function loadHistory() {
    setHistoryError("");
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error);
      setHistory((await res.json()).history);
    } catch (e) {
      setHistoryError(e instanceof Error && e.message ? e.message : "Couldn't load the history.");
    }
  }

  async function save() {
    if (form.status !== "pending" && !form.reviewer) {
      setNote({ text: "Choose your name under Reviewed by before saving.", error: true });
      return;
    }
    if (form.status === "rejected" && !form.feedback.trim()) {
      setNote({ text: "Add feedback so the team knows what to change before marking this Not approved.", error: true });
      return;
    }
    setSaving(true);
    setNote({ text: "Saving…" });
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      markDirty(false);
      onSaved(id, data as Review);
      setNote({ text: "Saved. Everyone reviewing the calendar will see it." });
      if (historyOpen) void loadHistory();
    } catch (e) {
      setNote({ text: e instanceof Error && e.message ? e.message : "Couldn't save. Check your connection and try again.", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}?reviewer=${encodeURIComponent(reviewerName)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      markDirty(false);
      setForm(fromReview(undefined, reviewerName));
      onSaved(id, null);
      setNote({ text: "Review cleared. This post is back to Awaiting review." });
      if (historyOpen) void loadHistory();
    } catch (e) {
      setNote({ text: e instanceof Error && e.message ? e.message : "Couldn't clear the review. Try again.", error: true });
    } finally {
      setSaving(false);
      setConfirmReset(false);
    }
  }

  function discard() {
    markDirty(false);
    setForm(fromReview(review, reviewerName));
    setNote(null);
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && dirty && !saving) {
      e.preventDefault();
      void save();
    }
  };

  return (
    <section aria-label="Founder review" className="grid min-w-0 content-start gap-4 self-start border border-line bg-paper p-4 sm:p-5" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-[22px] font-semibold leading-tight text-navy">Founder review</h3>
        <span className="text-[12px] text-muted">
          {review ? `Last saved ${formatTimestamp(review.updatedAt)}${review.reviewer ? ` by ${review.reviewer}` : ""}` : "Not reviewed yet"}
        </span>
      </div>

      <div className="grid gap-4">
        <fieldset className="grid w-full gap-1.5">
          <legend className="field-label mb-1.5">Status</legend>
          <div className="grid grid-cols-3 overflow-hidden rounded-sq border border-line bg-white">
            {STATUS_ORDER.map((s) => (
              <label key={s} className="relative flex cursor-pointer border-r border-line last:border-r-0">
                <input
                  type="radio"
                  id={`st-${id}-${s}`}
                  name={`st-${id}`}
                  value={s}
                  checked={form.status === s}
                  onChange={() => update("status", s)}
                  className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                />
                <span
                  className={`flex w-full items-center justify-center px-1.5 py-2 text-center text-[12.5px] font-medium transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-brass ${
                    form.status === s ? SEG_ACTIVE[s] : "text-muted hover:bg-brass-wash"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1.5">
          <span className="field-label">Reviewed by</span>
          <select id={`by-${id}`} className="input py-2" value={form.reviewer} onChange={(e) => update("reviewer", e.target.value)}>
            <option value="">Choose your name</option>
            {REVIEWERS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="field-label">
            Feedback — changes to the post{form.status === "rejected" && <span className="text-no-fg"> (required)</span>}
          </span>
          <textarea
            id={`fb-${id}`}
            className="input min-h-[96px] resize-y leading-normal"
            maxLength={LIMITS.feedback}
            placeholder="What should change in the copy, hook, visual or CTA?"
            value={form.feedback}
            onChange={(e) => update("feedback", e.target.value)}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="field-label">Remarks</span>
          <textarea
            id={`rm-${id}`}
            className="input min-h-[96px] resize-y leading-normal"
            maxLength={LIMITS.remarks}
            placeholder="Anything else: timing, approvals, facts to check"
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
          Save review
        </button>
        {dirty && (
          <button type="button" className="btn" disabled={saving} onClick={discard}>
            Discard changes
          </button>
        )}
        {note && <span className={`text-[13px] ${note.error ? "text-no-fg" : "text-muted"}`} role={note.error ? "alert" : "status"}>{note.text}</span>}
        <div className="flex w-full flex-wrap gap-2 border-t border-line pt-3">
          <button
            type="button"
            className="btn"
            aria-expanded={historyOpen}
            onClick={() => {
              const next = !historyOpen;
              setHistoryOpen(next);
              if (next) void loadHistory();
            }}
          >
            {historyOpen ? "Hide history" : "Review history"}
          </button>
          {review && !confirmReset && (
            <button type="button" className="btn" disabled={saving} onClick={() => setConfirmReset(true)}>
              Reset review
            </button>
          )}
        </div>
      </div>

      {confirmReset && (
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-cond-fg bg-cond-bg px-4 py-3 text-sm text-cond-fg" role="alert">
          <span>Clear the status, feedback and remarks on this post? The history keeps a record.</span>
          <div className="flex gap-2">
            <button type="button" className="btn border-cond-fg text-cond-fg" disabled={saving} onClick={reset}>
              Clear review
            </button>
            <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="border-t border-line pt-4">
          {historyError ? (
            <p className="text-sm text-no-fg">{historyError}</p>
          ) : history === null ? (
            <p className="text-sm text-muted">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted">No reviews saved on this post yet.</p>
          ) : (
            <ol className="grid gap-3">
              {history.map((h) => (
                <li key={h.id} className="grid gap-1 border-l-2 border-line pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {h.action === "reset" ? <span className="font-semibold text-muted">Review cleared</span> : <StatusChip status={h.status} />}
                    <span className="text-muted">
                      {formatTimestamp(h.at)}
                      {h.reviewer ? ` · ${h.reviewer}` : ""}
                    </span>
                  </div>
                  {h.feedback && (
                    <p className="whitespace-pre-line">
                      <span className="font-medium text-navy">Feedback: </span>
                      {h.feedback}
                    </p>
                  )}
                  {h.remarks && (
                    <p className="whitespace-pre-line">
                      <span className="font-medium text-navy">Remarks: </span>
                      {h.remarks}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
