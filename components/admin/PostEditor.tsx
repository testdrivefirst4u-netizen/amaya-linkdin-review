"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FOUNDERS, LIMITS, SOURCE_LABEL } from "@/lib/config";
import type { Channel, Post, PostImage, SourceType } from "@/lib/types";
import { ImageUploader } from "../Images";
import PostTile from "../PostTile";
import LinkedInPreview from "./LinkedInPreview";

type Form = {
  channel: Channel;
  founder: string;
  date: string;
  week: string;
  pillar: string;
  focus: string;
  topic: string;
  headline: string;
  hook: string;
  copy: string;
  cta: string;
  hashtags: string;
  audience: string;
  objective: string;
  format: string;
  creative: string;
  angle: string;
  visual: string;
  source: string;
  sourceType: SourceType;
  images: PostImage[];
};

type Props = {
  post?: Post;
  /** Monday of week 1 on the company calendar (YYYY-MM-DD), to fill in the week number. */
  weekStart?: string;
  pillars: string[];
  focuses: string[];
};

function weekFor(date: string, weekStart?: string) {
  if (!weekStart || !date) return "";
  const days = (Date.parse(date + "T00:00:00Z") - Date.parse(weekStart + "T00:00:00Z")) / 86400000;
  return Number.isFinite(days) && days >= 0 ? String(Math.floor(days / 7) + 1) : "";
}

function initial(post?: Post): Form {
  return {
    channel: post?.channel ?? "company",
    founder: post?.founder ?? FOUNDERS[0],
    date: post?.date ?? "",
    week: post?.week ? String(post.week) : "",
    pillar: post?.pillar ?? "",
    focus: post?.focus ?? "",
    topic: post?.topic ?? "",
    headline: post?.headline ?? "",
    hook: post?.hook ?? "",
    copy: post?.copy ?? "",
    cta: post?.cta ?? "",
    hashtags: post?.hashtags ?? "",
    audience: post?.audience ?? "",
    objective: post?.objective ?? "",
    format: post?.format ?? "",
    creative: post?.creative ?? "",
    angle: post?.angle ?? "",
    visual: post?.visual ?? "",
    source: post?.source ?? "",
    sourceType: post?.sourceType ?? "none",
    images: post?.images ?? [],
  };
}

export default function PostEditor({ post, weekStart, pillars, focuses }: Props) {
  const router = useRouter();
  const editing = Boolean(post);
  const [form, setForm] = useState<Form>(() => initial(post));
  const [weekTouched, setWeekTouched] = useState(Boolean(post?.week));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = useRef(false);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    dirty.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Fill the week number from the date until the admin types one.
  useEffect(() => {
    if (!weekTouched && form.channel === "company") setForm((f) => ({ ...f, week: weekFor(f.date, weekStart) }));
  }, [form.date, form.channel, weekStart, weekTouched]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const preview: Post = useMemo(
    () => ({
      postId: post?.postId ?? (form.channel === "company" ? "CO-W··" : "FO-··"),
      channel: form.channel,
      order: post?.order ?? 0,
      date: form.date || new Date().toISOString().slice(0, 10),
      topic: form.topic,
      audience: form.audience,
      hook: form.hook,
      copy: form.copy,
      cta: form.cta,
      visual: form.visual,
      hashtags: form.hashtags,
      source: form.source,
      sourceType: form.sourceType,
      images: form.images,
      ...(form.channel === "company"
        ? { week: Number(form.week) || undefined, pillar: form.pillar, headline: form.headline }
        : { founder: form.founder, focus: form.focus }),
    }),
    [form, post?.postId, post?.order],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(editing ? `/api/posts/${encodeURIComponent(post!.postId)}` : "/api/posts", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, week: form.week ? Number(form.week) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      dirty.current = false;
      router.push(`/#${data.postId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save the post. Try again.");
      setBusy(false);
    }
  }

  const company = form.channel === "company";

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      <div className="grid content-start gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-[30px] font-semibold leading-tight text-navy">{editing ? `Edit ${post!.postId}` : "New post"}</h2>
          <Link href="/admin" className="text-[13px] font-medium text-brass-dark underline-offset-4 hover:underline">
            Back to posts
          </Link>
        </div>

        <Group title="Who and when">
          <Field label="Post for">
            <select
              className="input"
              disabled={editing}
              value={company ? "company" : form.founder}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "company") set("channel", "company");
                else {
                  set("channel", "founder");
                  set("founder", v);
                }
              }}
            >
              <option value="company">Company page</option>
              {FOUNDERS.map((f) => (
                <option key={f} value={f}>
                  {f} (founder)
                </option>
              ))}
            </select>
            {editing && <Hint>The page or founder can&apos;t change after a post is created.</Hint>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publish date" required>
              <input type="date" className="input" required value={form.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            {company ? (
              <Field label="Week">
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={form.week}
                  onChange={(e) => {
                    setWeekTouched(true);
                    set("week", e.target.value);
                  }}
                />
              </Field>
            ) : (
              <Field label="Focus">
                <input className="input" list="focus-options" value={form.focus} onChange={(e) => set("focus", e.target.value)} />
                <datalist id="focus-options">
                  {focuses.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </Field>
            )}
          </div>
          {company && (
            <Field label="Content pillar" required>
              <input className="input" list="pillar-options" required value={form.pillar} onChange={(e) => set("pillar", e.target.value)} />
              <datalist id="pillar-options">
                {pillars.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
          )}
        </Group>

        <Group title="Images">
          <ImageUploader images={form.images} onChange={(imgs) => set("images", imgs)} folder="posts" />
          <Hint>The first image is the cover shown beside the post. Up to {LIMITS.images} images; they upload straight to ImageKit.</Hint>
        </Group>

        <Group title="The post">
          <Field label="Topic" required>
            <input className="input" required maxLength={LIMITS.field} value={form.topic} onChange={(e) => set("topic", e.target.value)} />
          </Field>
          {company && (
            <Field label="Headline on the creative">
              <input className="input" maxLength={LIMITS.field} value={form.headline} onChange={(e) => set("headline", e.target.value)} />
            </Field>
          )}
          <Field label="Hook" required>
            <textarea className="input min-h-[70px] resize-y leading-normal" required maxLength={LIMITS.field} value={form.hook} onChange={(e) => set("hook", e.target.value)} />
          </Field>
          <Field label="LinkedIn post copy" required>
            <textarea className="input min-h-[240px] resize-y leading-normal" required maxLength={LIMITS.copy} value={form.copy} onChange={(e) => set("copy", e.target.value)} />
            <Hint>Leave a blank line between paragraphs. {form.copy.length.toLocaleString()} / 3,000 characters LinkedIn shows.</Hint>
          </Field>
          <Field label="Call to action">
            <input className="input" maxLength={LIMITS.field} value={form.cta} onChange={(e) => set("cta", e.target.value)} />
          </Field>
          <Field label="Hashtags">
            <input className="input" maxLength={LIMITS.field} placeholder="#SeniorLiving #Amaya" value={form.hashtags} onChange={(e) => set("hashtags", e.target.value)} />
          </Field>
        </Group>

        <Group title="Brief">
          <Field label="Audience">
            <input className="input" maxLength={LIMITS.field} value={form.audience} onChange={(e) => set("audience", e.target.value)} />
          </Field>
          {company ? (
            <>
              <Field label="Objective">
                <textarea className="input min-h-[60px] resize-y" maxLength={LIMITS.field} value={form.objective} onChange={(e) => set("objective", e.target.value)} />
              </Field>
              <Field label="Format">
                <input className="input" maxLength={LIMITS.field} value={form.format} onChange={(e) => set("format", e.target.value)} />
              </Field>
              <Field label="Creative direction">
                <textarea className="input min-h-[60px] resize-y" maxLength={LIMITS.field} value={form.creative} onChange={(e) => set("creative", e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="Angle">
              <textarea className="input min-h-[60px] resize-y" maxLength={LIMITS.field} value={form.angle} onChange={(e) => set("angle", e.target.value)} />
            </Field>
          )}
          <Field label={company ? "Suggested visual" : "Image or video"}>
            <textarea className="input min-h-[60px] resize-y" maxLength={LIMITS.field} value={form.visual} onChange={(e) => set("visual", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="Source">
              <input className="input" maxLength={LIMITS.field} value={form.source} onChange={(e) => set("source", e.target.value)} />
            </Field>
            <Field label="Source type">
              <select className="input" value={form.sourceType} onChange={(e) => set("sourceType", e.target.value as SourceType)}>
                {(Object.keys(SOURCE_LABEL) as SourceType[]).map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Group>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-paper py-4">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create post"}
          </button>
          <Link href="/admin" className="btn">
            Cancel
          </Link>
          {error && (
            <span className="text-[13px] text-no-fg" role="alert">
              {error}
            </span>
          )}
          {!editing && !error && <span className="text-[13px] text-muted">New posts start as Awaiting review for the founders.</span>}
        </div>
      </div>

      <aside className="grid content-start gap-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pb-4">
        <div className="grid gap-2">
          <span className="field-label">Preview · calendar tile</span>
          <div className="w-[240px] max-w-full">
            <PostTile post={preview} status="pending" selected={false} onOpen={() => {}} />
          </div>
        </div>
        <div className="grid gap-2">
          <span className="field-label">Preview · LinkedIn feed</span>
          <div className="max-w-[555px]">
            <LinkedInPreview post={preview} />
          </div>
        </div>
      </aside>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border border-line bg-white p-4 sm:p-5">
      <legend className="px-1 font-serif text-[20px] font-semibold text-navy">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="field-label">
        {label}
        {required && <span className="text-no-fg"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-[12.5px] text-muted">{children}</span>;
}
