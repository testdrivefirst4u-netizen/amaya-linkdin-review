import "server-only";
import { COLLECTIONS, getDb } from "./mongodb";
import { FOUNDERS, LIMITS, SOURCE_LABEL } from "./config";
import { ValidationError } from "./data";
import { deleteImages, parseImages } from "./imagekit";
import type { Channel, Post, SourceType } from "./types";

const COMPANY_FIELDS = ["week", "pillar", "objective", "format", "creative", "headline"] as const;
const FOUNDER_FIELDS = ["founder", "focus", "angle"] as const;

/** Everything the admin can set on a post. */
export type PostInput = Omit<Post, "postId" | "order" | "origin" | "createdBy" | "editedAt">;

function text(b: Record<string, unknown>, key: string, label: string, opts: { required?: boolean; max?: number } = {}) {
  const v = typeof b[key] === "string" ? (b[key] as string).trim() : "";
  if (opts.required && !v) throw new ValidationError(`Add the ${label}.`);
  const max = opts.max ?? LIMITS.field;
  if (v.length > max) throw new ValidationError(`The ${label} is limited to ${max} characters.`);
  return v;
}

/** Checks and normalises a post sent by the admin form. */
export function parsePostInput(body: unknown, channelLock?: Channel): PostInput {
  if (!body || typeof body !== "object") throw new ValidationError("Send the post as a JSON object.");
  const b = body as Record<string, unknown>;
  const channel = (channelLock ?? b.channel) as Channel;
  if (channel !== "company" && channel !== "founder") throw new ValidationError("Choose Company page or a founder.");
  const date = text(b, "date", "date", { required: true });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date + "T00:00:00Z").getTime())) {
    throw new ValidationError("Pick a valid date.");
  }
  const sourceType = (b.sourceType || "none") as SourceType;
  if (!(sourceType in SOURCE_LABEL)) throw new ValidationError("Choose a source type from the list.");

  const post: PostInput = {
    channel,
    date,
    topic: text(b, "topic", "topic", { required: true }),
    hook: text(b, "hook", "hook", { required: true }),
    copy: text(b, "copy", "post copy", { required: true, max: LIMITS.copy }),
    cta: text(b, "cta", "call to action"),
    hashtags: text(b, "hashtags", "hashtags"),
    audience: text(b, "audience", "audience"),
    visual: text(b, "visual", "visual notes"),
    source: text(b, "source", "source"),
    sourceType,
    images: parseImages(b.images),
  };

  if (channel === "company") {
    post.pillar = text(b, "pillar", "pillar", { required: true });
    post.objective = text(b, "objective", "objective");
    post.format = text(b, "format", "format");
    post.creative = text(b, "creative", "creative direction");
    post.headline = text(b, "headline", "headline");
    if (b.week !== undefined && b.week !== null && b.week !== "") {
      const week = Number(b.week);
      if (!Number.isInteger(week) || week < 1 || week > 520) throw new ValidationError("Week must be a whole number.");
      post.week = week;
    }
  } else {
    const founder = text(b, "founder", "founder", { required: true });
    if (!(FOUNDERS as readonly string[]).includes(founder)) throw new ValidationError("Choose a founder from the list.");
    post.founder = founder;
    post.focus = text(b, "focus", "focus");
    post.angle = text(b, "angle", "angle");
  }
  return post;
}

async function nextIdentity(channel: Channel) {
  const db = await getDb();
  const posts = await db
    .collection<Post>(COLLECTIONS.posts)
    .find({ channel }, { projection: { postId: 1, order: 1 } })
    .toArray();
  const prefix = channel === "company" ? "CO-W" : "FO-";
  const maxNum = Math.max(0, ...posts.map((p) => Number(p.postId.slice(prefix.length)) || 0));
  const maxOrder = Math.max(0, ...posts.map((p) => p.order || 0));
  return { postId: `${prefix}${String(maxNum + 1).padStart(2, "0")}`, order: maxOrder + 1 };
}

export async function createPost(input: PostInput, createdBy: string): Promise<Post> {
  const db = await getDb();
  const now = new Date().toISOString();
  // Retry if two posts are created at the same moment and collide on the unique postId.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { postId, order } = await nextIdentity(input.channel);
    const post: Post = { ...input, postId, order, origin: "app", createdBy, editedAt: now };
    try {
      await db.collection<Post>(COLLECTIONS.posts).insertOne({ ...post });
      return post;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  throw new Error("Couldn't pick a new post ID. Try again.");
}

export async function updatePost(existing: Post, input: PostInput): Promise<Post> {
  const db = await getDb();
  const keep = { postId: existing.postId, order: existing.order, origin: existing.origin ?? "seed", createdBy: existing.createdBy };
  const post: Post = { ...input, ...keep, editedAt: new Date().toISOString() };
  if (!post.createdBy) delete post.createdBy;
  // Drop fields that belong to the other channel.
  for (const f of input.channel === "company" ? FOUNDER_FIELDS : COMPANY_FIELDS) delete post[f];
  await db.collection<Post>(COLLECTIONS.posts).replaceOne({ postId: existing.postId }, post);

  const stillUsed = new Set((post.images ?? []).map((i) => i.fileId));
  await deleteImages((existing.images ?? []).map((i) => i.fileId).filter((id) => !stillUsed.has(id)));
  return post;
}

/** Replaces only the images on a post, deleting removed files from ImageKit. */
export async function setPostImages(existing: Post, value: unknown): Promise<Post> {
  const images = parseImages(value);
  const db = await getDb();
  const editedAt = new Date().toISOString();
  await db.collection<Post>(COLLECTIONS.posts).updateOne({ postId: existing.postId }, { $set: { images, editedAt } });
  const stillUsed = new Set(images.map((i) => i.fileId));
  await deleteImages((existing.images ?? []).map((i) => i.fileId).filter((id) => !stillUsed.has(id)));
  return { ...existing, images, editedAt };
}

/** Deletes a post with its review, history, suggestions and images. */
export async function deletePost(post: Post): Promise<void> {
  const db = await getDb();
  const suggestions = await db
    .collection<{ images?: { fileId: string }[] }>(COLLECTIONS.suggestions)
    .find({ postId: post.postId }, { projection: { images: 1 } })
    .toArray();
  await Promise.all([
    db.collection(COLLECTIONS.posts).deleteOne({ postId: post.postId }),
    db.collection(COLLECTIONS.reviews).deleteOne({ postId: post.postId }),
    db.collection(COLLECTIONS.history).deleteMany({ postId: post.postId }),
    db.collection(COLLECTIONS.suggestions).deleteMany({ postId: post.postId }),
  ]);
  const ids = new Set([...(post.images ?? []), ...suggestions.flatMap((s) => s.images ?? [])].map((i) => i.fileId));
  await deleteImages([...ids]);
}
