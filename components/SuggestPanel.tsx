"use client";

import { useEffect, useState } from "react";
import { CHANGE_LABEL, LIMITS } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { Post, PostImage, SessionUser, Suggestion, SuggestionChanges } from "@/lib/types";
import { Gallery, ImageUploader } from "./Images";
import { SuggestionChip } from "./ui";

const KEYS = Object.keys(CHANGE_LABEL) as (keyof SuggestionChanges)[];

function wordingOf(p: Post): Required<SuggestionChanges> {
  return { hook: p.hook ?? "", copy: p.copy ?? "", cta: p.cta ?? "", hashtags: p.hashtags ?? "" };
}

/** Founders propose new wording or images. The admin approves or declines them in /admin/suggestions. */
export default function SuggestPanel({ post, user }: { post: Post; user: SessionUser }) {
  const [list, setList] = useState<Suggestion[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [wording, setWording] = useState(() => wordingOf(post));
  const [editWording, setEditWording] = useState(false);
  const [images, setImages] = useState<PostImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(post.postId)}/suggestions`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setList(data);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error && e.message ? e.message : "Couldn't load suggestions.");
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.postId, post.editedAt]);

  function reset() {
    setOpen(false);
    setMessage("");
    setWording(wordingOf(post));
    setEditWording(false);
    setImages([]);
  }

  async function send() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(post.postId)}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, changes: editWording ? wording : {}, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setList((l) => [data as Suggestion, ...(l ?? [])]);
      reset();
      setNote({ text: "Sent. The admin will review it before anything changes on the post." });
    } catch (e) {
      setNote({ text: e instanceof Error && e.message ? e.message : "Couldn't send. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  const openCount = list?.filter((s) => s.status === "open").length ?? 0;

  return (
    <section aria-label="Suggestions" className="grid gap-4 border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-[22px] font-semibold leading-tight text-navy">Suggestions</h3>
        <span className="text-[12px] text-muted">{openCount ? `${openCount} waiting for admin` : "Changes go to the admin for approval"}</span>
      </div>

      {user.role === "admin" ? (
        openCount > 0 && (
          <a className="btn justify-self-start" href={`/admin/suggestions#${post.postId}`}>
            Review suggestions
          </a>
        )
      ) : !open ? (
        <button type="button" className="btn justify-self-start" onClick={() => setOpen(true)}>
          Suggest changes
        </button>
      ) : (
        <div className="grid gap-4 border-l-2 border-brass pl-4">
          <label className="grid gap-1.5">
            <span className="field-label">What would you change?</span>
            <textarea
              className="input min-h-[88px] resize-y leading-normal"
              maxLength={LIMITS.message}
              placeholder="e.g. Use a photo of the clubhouse instead, and soften the second paragraph."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" checked={editWording} onChange={(e) => setEditWording(e.target.checked)} />
            Propose new wording
          </label>
          {editWording &&
            KEYS.map((k) => (
              <label key={k} className="grid gap-1.5">
                <span className="field-label">{CHANGE_LABEL[k]}</span>
                <textarea
                  className={`input resize-y leading-normal ${k === "copy" ? "min-h-[200px]" : "min-h-[60px]"}`}
                  maxLength={k === "copy" ? LIMITS.copy : LIMITS.field}
                  value={wording[k]}
                  onChange={(e) => setWording((w) => ({ ...w, [k]: e.target.value }))}
                />
              </label>
            ))}

          <div className="grid gap-1.5">
            <span className="field-label">Images to use (optional)</span>
            <ImageUploader images={images} onChange={setImages} folder="suggestions" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={send}>
              {busy ? "Sending…" : "Send to admin"}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={reset}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {note && (
        <p className={`text-[13px] ${note.error ? "text-no-fg" : "text-muted"}`} role={note.error ? "alert" : "status"}>
          {note.text}
        </p>
      )}

      {loadError ? (
        <p className="text-sm text-no-fg">{loadError}</p>
      ) : list === null ? (
        <p className="text-sm text-muted">Loading suggestions…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">No suggestions on this post yet.</p>
      ) : (
        <ol className="grid gap-4">
          {list.map((s) => (
            <li key={s.id}>
              <SuggestionView s={s} post={post} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** One suggestion: who, when, status, the note, proposed wording side by side with the current text, and images. */
export function SuggestionView({ s, post }: { s: Suggestion; post?: Post }) {
  const changed = KEYS.filter((k) => s.changes[k] !== undefined);
  return (
    <div className="grid gap-2.5 border-l-2 border-line pl-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <SuggestionChip status={s.status} />
        <span className="text-muted">
          {s.author} · {formatTimestamp(s.createdAt)}
        </span>
      </div>
      {s.message && <p className="whitespace-pre-line text-body">{s.message}</p>}
      {changed.map((k) => (
        <div key={k} className="grid gap-1">
          <span className="field-label">{CHANGE_LABEL[k]}</span>
          {post && s.status === "open" && (
            <p className="whitespace-pre-line bg-no-bg/60 px-2 py-1 text-[13px] text-muted line-through decoration-no-fg/40">{post[k] || "(empty)"}</p>
          )}
          <p className="whitespace-pre-line bg-ok-bg/70 px-2 py-1 text-[13px] text-ink">{s.changes[k] || "(remove)"}</p>
        </div>
      ))}
      {s.images.length > 0 && <Gallery images={s.images} label="Suggested images" />}
      {s.status !== "open" && (
        <p className="text-[12.5px] text-muted">
          {s.status === "accepted" ? "Approved" : "Declined"} by {s.decidedBy}
          {s.decidedAt ? ` · ${formatTimestamp(s.decidedAt)}` : ""}
          {s.adminNote ? ` — “${s.adminNote}”` : ""}
        </p>
      )}
    </div>
  );
}
