import "server-only";
import { COLLECTIONS, getDb } from "./mongodb";
import { LIMITS, REVIEWERS, STATUS_ORDER } from "./config";
import type { MixData, Post, Review, ReviewHistoryEntry, ReviewInput, ReviewStatus } from "./types";

type ReviewDoc = Omit<Review, "updatedAt"> & { updatedAt: Date; createdAt?: Date };
type HistoryDoc = Omit<ReviewHistoryEntry, "id" | "at"> & { at: Date };

function toReview(d: ReviewDoc): Review {
  return {
    postId: d.postId,
    status: d.status,
    reviewer: d.reviewer ?? "",
    feedback: d.feedback ?? "",
    remarks: d.remarks ?? "",
    updatedAt: new Date(d.updatedAt).toISOString(),
  };
}

export async function getPosts(): Promise<Post[]> {
  const db = await getDb();
  return db
    .collection<Post>(COLLECTIONS.posts)
    .find({}, { projection: { _id: 0 } })
    .sort({ channel: 1, order: 1 })
    .toArray();
}

export async function getPost(postId: string): Promise<Post | null> {
  const db = await getDb();
  return db.collection<Post>(COLLECTIONS.posts).findOne({ postId }, { projection: { _id: 0 } });
}

export async function getMix(): Promise<MixData | null> {
  const db = await getDb();
  const doc = await db
    .collection<MixData & { key: string }>(COLLECTIONS.settings)
    .findOne({ key: "monthly-mix" }, { projection: { _id: 0, key: 0 } });
  return doc as MixData | null;
}

export async function getReviews(): Promise<Review[]> {
  const db = await getDb();
  const docs = await db.collection<ReviewDoc>(COLLECTIONS.reviews).find({}, { projection: { _id: 0 } }).toArray();
  return docs.map(toReview);
}

export async function getReview(postId: string): Promise<Review | null> {
  const db = await getDb();
  const doc = await db.collection<ReviewDoc>(COLLECTIONS.reviews).findOne({ postId }, { projection: { _id: 0 } });
  return doc ? toReview(doc) : null;
}

export async function getHistory(postId: string, limit = 50): Promise<ReviewHistoryEntry[]> {
  const db = await getDb();
  const docs = await db
    .collection<HistoryDoc>(COLLECTIONS.history)
    .find({ postId })
    .sort({ at: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    id: String(d._id),
    postId: d.postId,
    action: d.action,
    status: d.status,
    reviewer: d.reviewer ?? "",
    feedback: d.feedback ?? "",
    remarks: d.remarks ?? "",
    at: new Date(d.at).toISOString(),
  }));
}

export class ValidationError extends Error {}

/** Checks and normalises a review body sent by the browser. */
export function parseReviewInput(body: unknown): ReviewInput {
  if (!body || typeof body !== "object") throw new ValidationError("Send the review as a JSON object.");
  const b = body as Record<string, unknown>;
  const status = b.status as ReviewStatus;
  if (!STATUS_ORDER.includes(status)) throw new ValidationError("Status must be pending, approved or rejected.");
  const reviewer = typeof b.reviewer === "string" ? b.reviewer.trim() : "";
  const feedback = typeof b.feedback === "string" ? b.feedback.trim() : "";
  const remarks = typeof b.remarks === "string" ? b.remarks.trim() : "";
  if (reviewer && !(REVIEWERS as readonly string[]).includes(reviewer)) {
    throw new ValidationError("Choose a reviewer from the list.");
  }
  if (status !== "pending" && !reviewer) throw new ValidationError("Choose your name under Reviewed by before saving.");
  if (status === "rejected" && !feedback) {
    throw new ValidationError("Add feedback so the team knows what to change before marking a post Not approved.");
  }
  if (feedback.length > LIMITS.feedback) throw new ValidationError(`Feedback is limited to ${LIMITS.feedback} characters.`);
  if (remarks.length > LIMITS.remarks) throw new ValidationError(`Remarks are limited to ${LIMITS.remarks} characters.`);
  return { status, reviewer, feedback, remarks };
}

export async function saveReview(postId: string, input: ReviewInput): Promise<Review> {
  const db = await getDb();
  const now = new Date();
  await db.collection<ReviewDoc>(COLLECTIONS.reviews).updateOne(
    { postId },
    { $set: { postId, ...input, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  await db.collection<HistoryDoc>(COLLECTIONS.history).insertOne({ postId, action: "saved", ...input, at: now });
  return { postId, ...input, updatedAt: now.toISOString() };
}

export async function resetReview(postId: string, reviewer: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.reviews).deleteOne({ postId });
  await db.collection<HistoryDoc>(COLLECTIONS.history).insertOne({
    postId,
    action: "reset",
    status: "pending",
    reviewer: (REVIEWERS as readonly string[]).includes(reviewer) ? reviewer : "",
    feedback: "",
    remarks: "",
    at: new Date(),
  });
}
