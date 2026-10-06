"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/config";
import { thumb } from "@/lib/images";
import type { PostImage } from "@/lib/types";

/** Small square preview for the post row. Shows a "+2" badge when there are more images. */
export function RowThumb({ images }: { images?: PostImage[] }) {
  const first = images?.[0];
  if (!first) {
    return (
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-sq border border-dashed border-line text-muted/50 md:h-[84px] md:w-[84px]" aria-label="No image yet">
        <ImageIcon />
      </span>
    );
  }
  return (
    <span className="relative block h-[72px] w-[72px] overflow-hidden rounded-sq border border-line bg-limestone md:h-[84px] md:w-[84px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb(first.url, 200, 200)} alt="" loading="lazy" className="h-full w-full object-cover" />
      {images!.length > 1 && (
        <span className="absolute bottom-1 right-1 rounded-full bg-navy/85 px-1.5 text-[11px] font-medium leading-[18px] text-white">+{images!.length - 1}</span>
      )}
    </span>
  );
}

export function ImageIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

/** Large image with a strip of thumbnails; click to open full size. */
export function Gallery({ images, label = "Post images" }: { images: PostImage[]; label?: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  if (!images.length) return null;
  const current = images[Math.min(active, images.length - 1)];
  return (
    <figure aria-label={label} className="grid gap-2">
      <button type="button" className="group relative block overflow-hidden rounded-sq border border-line bg-limestone" onClick={() => setZoom(active)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(current.url, 1100)} alt={current.name || "Post image"} className="mx-auto max-h-[420px] w-auto object-contain" />
        <span className="absolute right-2 top-2 rounded-sq bg-navy/80 px-2 py-0.5 text-[11.5px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          View full size
        </span>
      </button>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img.fileId}
              type="button"
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={`h-14 w-14 overflow-hidden rounded-sq border-2 ${i === active ? "border-brass" : "border-transparent opacity-75 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(img.url, 120, 120)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoom !== null && <Lightbox images={images} start={zoom} onClose={() => setZoom(null)} />}
    </figure>
  );
}

export function Lightbox({ images, start, onClose }: { images: PostImage[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = useCallback((d: number) => setI((n) => (n + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  const img = images[i];
  return (
    <div role="dialog" aria-modal="true" aria-label="Image viewer" className="fixed inset-0 z-50 flex flex-col bg-navy/95 p-4" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 text-[13px] text-mast-sub" onClick={(e) => e.stopPropagation()}>
        <span className="truncate">
          {images.length > 1 ? `${i + 1} of ${images.length} · ` : ""}
          {img.name}
        </span>
        <div className="flex gap-2">
          <a className="btn border-mast-muted text-white hover:bg-navy-2" href={img.url} target="_blank" rel="noreferrer">
            Open original
          </a>
          <button ref={closeRef} type="button" className="btn border-mast-muted text-white hover:bg-navy-2" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(img.url, 2000)} alt={img.name || "Post image"} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {images.length > 1 && (
          <>
            <NavButton side="left" onClick={() => go(-1)} />
            <NavButton side="right" onClick={() => go(1)} />
          </>
        )}
      </div>
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous image" : "Next image"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-0" : "right-0"} flex h-11 w-11 items-center justify-center rounded-full bg-navy-2/90 text-white hover:bg-navy-line`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d={side === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

type UploadAuth = { token: string; expire: number; signature: string; publicKey: string; folder: string };

async function uploadOne(file: File, folder: string): Promise<PostImage> {
  const authRes = await fetch("/api/imagekit/auth", { cache: "no-store" });
  const auth = (await authRes.json()) as UploadAuth & { error?: string };
  if (!authRes.ok) throw new Error(auth.error || "Couldn't start the upload.");
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name.replace(/[^\w.\-]+/g, "_") || "image");
  form.append("publicKey", auth.publicKey);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  form.append("folder", `${auth.folder}/${folder}`);
  form.append("useUniqueFileName", "true");
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "ImageKit rejected the upload.");
  return { fileId: data.fileId, url: data.url, name: file.name, width: data.width, height: data.height };
}

/** Picks, uploads (straight to ImageKit), reorders and removes images. The first image is the cover. */
export function ImageUploader({
  images,
  onChange,
  folder,
  max = LIMITS.images,
}: {
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
  folder: "posts" | "suggestions";
  max?: number;
}) {
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceAt = useRef<number | null>(null);
  const latest = useRef(images);
  latest.current = images;

  async function add(files: FileList | File[]) {
    setError("");
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return setError("Choose image files (JPG, PNG, WebP or GIF).");
    const room = max - latest.current.length;
    if (room <= 0) return setError(`You can add up to ${max} images.`);
    const tooBig = list.find((f) => f.size > LIMITS.imageBytes);
    if (tooBig) return setError(`${tooBig.name} is larger than ${LIMITS.imageBytes / 1024 / 1024} MB.`);
    const take = list.slice(0, room);
    for (let n = 0; n < take.length; n++) {
      setBusy(take.length > 1 ? `Uploading ${n + 1} of ${take.length}…` : "Uploading…");
      try {
        const img = await uploadOne(take[n], folder);
        onChange([...latest.current, img]);
        latest.current = [...latest.current, img];
      } catch (e) {
        setError(`${take[n].name}: ${e instanceof Error ? e.message : "upload failed"}`);
        break;
      }
    }
    if (list.length > room) setError(`Only the first ${room} image${room > 1 ? "s were" : " was"} added. The limit is ${max}.`);
    setBusy("");
  }

  /** Swaps one image for a new upload in the same position. The old file is deleted when the post is saved. */
  async function replace(file: File | undefined) {
    const i = replaceAt.current;
    replaceAt.current = null;
    if (i === null || !file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPG, PNG, WebP or GIF).");
    if (file.size > LIMITS.imageBytes) return setError(`${file.name} is larger than ${LIMITS.imageBytes / 1024 / 1024} MB.`);
    setBusy(`Replacing image ${i + 1}…`);
    try {
      const img = await uploadOne(file, folder);
      const next = latest.current.map((x, n) => (n === i ? img : x));
      latest.current = next;
      onChange(next);
    } catch (e) {
      setError(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
    } finally {
      setBusy("");
    }
  }

  function move(i: number, d: number) {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2.5">
          {images.map((img, i) => (
            <li key={img.fileId} className="grid gap-1">
              <div className="relative aspect-square overflow-hidden rounded-sq border border-line bg-limestone">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb(img.url, 240, 240)} alt={img.name} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded-sq bg-navy/85 px-1.5 text-[10.5px] font-medium uppercase tracking-wider text-white">Cover</span>}
              </div>
              <div className="flex items-center justify-between gap-1 text-[12px]">
                <span className="flex gap-1">
                  <IconBtn label="Move left" disabled={i === 0} onClick={() => move(i, -1)} d="M15 6l-6 6 6 6" />
                  <IconBtn label="Move right" disabled={i === images.length - 1} onClick={() => move(i, 1)} d="M9 6l6 6-6 6" />
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="font-medium text-brass-dark hover:underline disabled:opacity-40"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      replaceAt.current = i;
                      replaceRef.current?.click();
                    }}
                  >
                    Replace
                  </button>
                  <button type="button" className="font-medium text-no-fg hover:underline disabled:opacity-40" disabled={Boolean(busy)} onClick={() => onChange(images.filter((x) => x.fileId !== img.fileId))}>
                    Remove
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) void add(e.dataTransfer.files);
        }}
        className={`flex flex-wrap items-center gap-3 rounded-sq border border-dashed px-4 py-3.5 text-[13px] ${drag ? "border-brass bg-brass-wash" : "border-line bg-white"}`}
      >
        <ImageIcon className="h-5 w-5 text-muted" />
        <span className="text-muted">{busy || (images.length >= max ? `Limit of ${max} images reached.` : "Drop images here or")}</span>
        {!busy && images.length < max && (
          <button type="button" className="btn px-3 py-1.5 text-[12.5px]" onClick={() => inputRef.current?.click()}>
            Choose images
          </button>
        )}
        <input
          ref={replaceRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void replace(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="text-[13px] text-no-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Admin panel to add, reorder and remove a post's images without opening the full editor. */
export function PostImagesManager({
  postId,
  images: initial,
  onSaved,
  onClose,
}: {
  postId: string;
  images: PostImage[];
  onSaved: (images: PostImage[]) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(images.map((i) => i.fileId)) !== JSON.stringify(initial.map((i) => i.fileId));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data.images ?? []);
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save the images. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 border border-brass/50 bg-brass-wash/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="field-label">Images for {postId}</span>
        <span className="text-[12px] text-muted">The first image is the cover shown beside the post.</span>
      </div>
      <ImageUploader images={images} onChange={setImages} folder="posts" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={save}>
          {busy ? "Saving…" : "Save images"}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        {dirty && !error && <span className="text-[13px] text-muted">Unsaved changes</span>}
        {error && (
          <span className="text-[13px] text-no-fg" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

function IconBtn({ label, d, disabled, onClick }: { label: string; d: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="rounded-sq border border-line p-0.5 text-muted hover:text-navy disabled:opacity-30">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}
