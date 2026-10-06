"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LIMITS, STATUS_LABEL, STATUS_ORDER } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { PersonReview, Post, Review, ReviewHistoryEntry, ReviewInput, ReviewStatus, SessionUser } from "@/lib/types";
import { StatusChip } from "./ui";

type Props = {
  post: Post;
  review?: Review;
  /** Everyone's own latest review on this post. */
  people?: PersonReview[];
  user: SessionUser;
  onSaved: (postId: string, review: Review | null, people: PersonReview[] | null) => void;
  onDirtyChange: (postId: string, dirty: boolean) => void;
};

const SEG_ACTIVE: Record<ReviewStatus, string> = {
  pending: "bg-navy text-white",
  approved: "bg-navy text-white",
  rejected: "bg-no-fg text-white",
};

/** The form always starts from the signed-in person's own review, never someone else's. */
function fromMine(mine: PersonReview | undefined): ReviewInput {
  return {
    status: mine?.status ?? "pending",
    feedback: mine?.feedback ?? "",
    remarks: mine?.remarks ?? "",
  };
}

export default function ReviewPanel({ post, review, people = [], user, onSaved, onDirtyChange }: Props) {
  const id = post.postId;
  const mine = people.find((r) => r.reviewer === user.name);
  const others = people.filter((r) => r.reviewer !== user.name);
  const [form, setForm] = useState<ReviewInput>(() => fromMine(mine));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [history, setHistory] = useState<ReviewHistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const dirtyRef = useRef(false);

  // Follow this person's own saved review (e.g. saved on another device), unless they're mid-edit.
  // Other founders' saves never touch this form.
  useEffect(() => {
    if (!dirtyRef.current) setForm(fromMine(mine));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.at, mine?.status]);

  useEffect(() => {
    if (historyOpen) void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.updatedAt, people.length]);

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

  async function save(body: ReviewInput = form) {
    if (body.status === "rejected" && !body.feedback.trim()) {
      setNote({ text: "Add feedback so the team knows what to change before marking this Not approved.", error: true });
      return;
    }
    setSaving(true);
    setNote({ text: "Saving…" });
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      markDirty(false);
      setForm(body);
      onSaved(id, data.review, data.people);
      setNote({ text: body === form ? "Saved under your name. Everyone reviewing the calendar will see it." : "Your review is cleared." });
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
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      markDirty(false);
      setForm(fromMine(undefined));
      onSaved(id, null, null);
      setNote({ text: "All reviews cleared. This post is back to Awaiting review." });
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
    setForm(fromMine(mine));
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
        <h3 className="font-serif text-[22px] font-semibold leading-tight text-navy">Your review</h3>
        <span className="text-[12px] text-muted">{mine ? `You saved this ${formatTimestamp(mine.at)}` : "You haven't reviewed this post yet"}</span>
      </div>

      <OthersReviews others={others} overall={review} />

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
        <p className="text-[13px] text-muted">
          Saving as <b className="font-medium text-navy">{user.name}</b>. Other founders&apos; reviews stay as they are.
        </p>
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
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={() => save()}>
          Save my review
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
          {mine && !dirty && (
            <button type="button" className="btn" disabled={saving} onClick={() => save({ status: "pending", feedback: "", remarks: "" })}>
              Clear my review
            </button>
          )}
          {user.role === "admin" && (review || people.length > 0) && !confirmReset && (
            <button type="button" className="btn" disabled={saving} onClick={() => setConfirmReset(true)}>
              Reset all reviews
            </button>
          )}
        </div>
      </div>

      {confirmReset && (
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-cond-fg bg-cond-bg px-4 py-3 text-sm text-cond-fg" role="alert">
          <span>Clear every founder&apos;s review on this post? The history keeps a record.</span>
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

/** Read-only summary of everyone else's review, plus the post's overall status. */
function OthersReviews({ others, overall }: { others: PersonReview[]; overall?: Review }) {
  return (
    <div className="grid gap-2 border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="field-label">Other reviews</span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted">
          Overall <StatusChip status={overall?.status ?? "pending"} />
        </span>
      </div>
      {others.length === 0 ? (
        <p className="text-[13px] text-muted">No one else has reviewed this post yet.</p>
      ) : (
        <ul className="grid gap-2.5">
          {[...others]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((r) => (
              <li key={r.reviewer} className="grid gap-0.5 border-l-2 border-line pl-2.5 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-medium text-navy">{r.reviewer}</b>
                  <StatusChip status={r.status} />
                  <span className="text-[12px] text-muted">{formatTimestamp(r.at)}</span>
                </div>
                {r.feedback && <Clamped label="Feedback" text={r.feedback} className="text-body" />}
                {r.remarks && <Clamped label="Remarks" text={r.remarks} className="text-muted" />}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/** Long notes show three lines with a toggle, so they don't push your own review off the screen. */
function Clamped({ label, text, className }: { label: string; text: string; className: string }): ReactNode {
  const [open, setOpen] = useState(false);
  const long = text.length > 220 || text.split("\n").length > 3;
  return (
    <div className={className}>
      <p className={`whitespace-pre-line ${long && !open ? "line-clamp-3" : ""}`}>
        <span className="font-medium text-navy">{label}: </span>
        {text}
      </p>
      {long && (
        <button type="button" className="text-[12px] font-medium text-brass-dark hover:underline" onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
}
