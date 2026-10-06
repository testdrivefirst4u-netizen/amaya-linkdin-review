import "server-only";
import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "./mongodb";
import { CHANGE_LABEL, LIMITS } from "./config";
import { ValidationError } from "./data";
import { parseImages } from "./imagekit";
import type { Post, PostImage, Suggestion, SuggestionChanges, SuggestionStatus } from "./types";

type SuggestionDoc = Omit<Suggestion, "id" | "createdAt" | "decidedAt"> & { _id: ObjectId; createdAt: Date; decidedAt?: Date };

const CHANGE_KEYS = Object.keys(CHANGE_LABEL) as (keyof SuggestionChanges)[];

function toSuggestion(d: SuggestionDoc): Suggestion {
  return {
    id: String(d._id),
    postId: d.postId,
    author: d.author,
    message: d.message ?? "",
    changes: d.changes ?? {},
    images: d.images ?? [],
    status: d.status,
    createdAt: new Date(d.createdAt).toISOString(),
    decidedBy: d.decidedBy,
    decidedAt: d.decidedAt ? new Date(d.decidedAt).toISOString() : undefined,
    adminNote: d.adminNote,
  };
}

/** Keeps only the wording that differs from the post, so the admin sees real changes. */
export function parseSuggestionInput(body: unknown, post: Post) {
  if (!body || typeof body !== "object") throw new ValidationError("Send the suggestion as a JSON object.");
  const b = body as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (message.length > LIMITS.message) throw new ValidationError(`The note is limited to ${LIMITS.message} characters.`);
  const raw = (b.changes ?? {}) as Record<string, unknown>;
  const changes: SuggestionChanges = {};
  for (const k of CHANGE_KEYS) {
    const v = typeof raw[k] === "string" ? (raw[k] as string).trim() : undefined;
    if (v === undefined || v === (post[k] ?? "").trim()) continue;
    if (v.length > (k === "copy" ? LIMITS.copy : LIMITS.field)) throw new ValidationError(`The suggested ${CHANGE_LABEL[k].toLowerCase()} is too long.`);
    changes[k] = v;
  }
  const images = parseImages(b.images);
  if (!message && !Object.keys(changes).length && !images.length) {
    throw new ValidationError("Write what you'd change, edit the wording or add an image before sending.");
  }
  return { message, changes, images };
}

export async function createSuggestion(postId: string, author: string, input: { message: string; changes: SuggestionChanges; images: PostImage[] }) {
  const db = await getDb();
  const doc: SuggestionDoc = { _id: new ObjectId(), postId, author, ...input, status: "open", createdAt: new Date() };
  await db.collection<SuggestionDoc>(COLLECTIONS.suggestions).insertOne(doc);
  return toSuggestion(doc);
}

export async function listSuggestions(filter: { postId?: string; status?: SuggestionStatus } = {}): Promise<Suggestion[]> {
  const db = await getDb();
  const docs = await db
    .collection<SuggestionDoc>(COLLECTIONS.suggestions)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  return docs.map(toSuggestion);
}

export async function countOpenSuggestions(): Promise<number> {
  const db = await getDb();
  return db.collection(COLLECTIONS.suggestions).countDocuments({ status: "open" });
}

/** Approve (apply the wording and add the images to the post) or decline an open suggestion. */
export async function decideSuggestion(id: string, accept: boolean, admin: string, note: string): Promise<Suggestion> {
  if (!ObjectId.isValid(id)) throw new ValidationError("No suggestion with that ID.");
  if (note.length > LIMITS.message) throw new ValidationError(`The note is limited to ${LIMITS.message} characters.`);
  const db = await getDb();
  const col = db.collection<SuggestionDoc>(COLLECTIONS.suggestions);
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new ValidationError("No suggestion with that ID.");
  if (doc.status !== "open") throw new ValidationError("This suggestion has already been handled.");

  let images: PostImage[] = [];
  if (accept) {
    const post = await db.collection<Post>(COLLECTIONS.posts).findOne({ postId: doc.postId });
    if (!post) throw new ValidationError("The post for this suggestion no longer exists.");
    const have = new Set((post.images ?? []).map((i) => i.fileId));
    images = [...(post.images ?? []), ...(doc.images ?? []).filter((i) => !have.has(i.fileId))];
    if (images.length > LIMITS.images) {
      throw new ValidationError(`The post would have more than ${LIMITS.images} images. Remove some from the post first.`);
    }
  }

  // Claim it first (guarded on status) so a double click can't apply it twice.
  const decided = { status: (accept ? "accepted" : "declined") as SuggestionStatus, decidedBy: admin, decidedAt: new Date(), adminNote: note };
  const res = await col.findOneAndUpdate({ _id: doc._id, status: "open" }, { $set: decided }, { returnDocument: "after" });
  if (!res) throw new ValidationError("This suggestion has already been handled.");
  if (accept) {
    await db
      .collection<Post>(COLLECTIONS.posts)
      .updateOne({ postId: doc.postId }, { $set: { ...doc.changes, images, editedAt: new Date().toISOString() } });
  }
  return toSuggestion(res);
}
