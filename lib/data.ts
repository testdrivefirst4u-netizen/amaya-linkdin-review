import "server-only";
import { COLLECTIONS, getDb } from "./mongodb";
import { LIMITS, STATUS_ORDER } from "./config";
import type { MixData, PersonReview, Post, Review, ReviewHistoryEntry, ReviewInput, ReviewStatus } from "./types";

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
    .sort({ channel: 1, date: 1, order: 1 })
    .toArray();
}

/** Changes whenever a post is created, edited or deleted, so open pages know to reload the posts. */
export async function getPostsVersion(): Promise<string> {
  const db = await getDb();
  const col = db.collection<Post>(COLLECTIONS.posts);
  const [count, latest] = await Promise.all([
    col.countDocuments(),
    col.find({ editedAt: { $exists: true } }, { projection: { _id: 0, editedAt: 1 } }).sort({ editedAt: -1 }).limit(1).next(),
  ]);
  return `${count}:${latest?.editedAt ?? ""}`;
}

/** Version for the posts a page was rendered with; must match getPostsVersion. */
export function postsVersionOf(posts: Post[]): string {
  const latest = posts.reduce((m, p) => (p.editedAt && p.editedAt > m ? p.editedAt : m), "");
  return `${posts.length}:${latest}`;
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

/** Replays review history into each person's latest review per post. A reset clears everyone on that post. */
function foldPeople(docs: HistoryDoc[]): Map<string, Map<string, PersonReview>> {
  const byPost = new Map<string, Map<string, PersonReview>>();
  for (const d of docs) {
    if (d.action === "reset") {
      byPost.delete(d.postId);
      continue;
    }
    if (!d.reviewer) continue;
    if (!byPost.has(d.postId)) byPost.set(d.postId, new Map());
    const people = byPost.get(d.postId)!;
    const feedback = d.feedback ?? "";
    const remarks = d.remarks ?? "";
    // "Awaiting review" with nothing written means the person withdrew their review.
    if (d.status === "pending" && !feedback && !remarks) people.delete(d.reviewer);
    else people.set(d.reviewer, { reviewer: d.reviewer, status: d.status, feedback, remarks, at: new Date(d.at).toISOString() });
  }
  return byPost;
}

/**
 * Each person's own latest review on each post, from the review history.
 * Founders review independently; one person's save never changes another's.
 */
export async function getReviewsByPerson(): Promise<Record<string, PersonReview[]>> {
  const db = await getDb();
  const docs = await db.collection<HistoryDoc>(COLLECTIONS.history).find({}).sort({ at: 1 }).toArray();
  return Object.fromEntries([...foldPeople(docs)].map(([postId, people]) => [postId, [...people.values()]]));
}

async function peopleFor(postId: string): Promise<PersonReview[]> {
  const db = await getDb();
  const docs = await db.collection<HistoryDoc>(COLLECTIONS.history).find({ postId }).sort({ at: 1 }).toArray();
  return [...(foldPeople(docs).get(postId)?.values() ?? [])];
}

/**
 * The post's overall status from everyone's reviews: Not approved if anyone said no,
 * otherwise Approved if anyone approved, otherwise Awaiting review.
 * Reviewer and feedback come from the latest review with that status.
 */
export function overallFrom(postId: string, people: PersonReview[]): Review | null {
  const status: ReviewStatus = people.some((p) => p.status === "rejected")
    ? "rejected"
    : people.some((p) => p.status === "approved")
      ? "approved"
      : "pending";
  if (status === "pending") return null;
  const latest = people.filter((p) => p.status === status).sort((x, y) => y.at.localeCompare(x.at))[0];
  return { postId, status, reviewer: latest.reviewer, feedback: latest.feedback, remarks: latest.remarks, updatedAt: latest.at };
}

export class ValidationError extends Error {}

/** Checks and normalises a review body sent by the browser. The reviewer is the signed-in person. */
export function parseReviewInput(body: unknown): ReviewInput {
  if (!body || typeof body !== "object") throw new ValidationError("Send the review as a JSON object.");
  const b = body as Record<string, unknown>;
  const status = b.status as ReviewStatus;
  if (!STATUS_ORDER.includes(status)) throw new ValidationError("Status must be pending, approved or rejected.");
  const feedback = typeof b.feedback === "string" ? b.feedback.trim() : "";
  const remarks = typeof b.remarks === "string" ? b.remarks.trim() : "";
  if (status === "rejected" && !feedback) {
    throw new ValidationError("Add feedback so the team knows what to change before marking a post Not approved.");
  }
  if (feedback.length > LIMITS.feedback) throw new ValidationError(`Feedback is limited to ${LIMITS.feedback} characters.`);
  if (remarks.length > LIMITS.remarks) throw new ValidationError(`Remarks are limited to ${LIMITS.remarks} characters.`);
  return { status, feedback, remarks };
}

/** Saves one person's review, then recomputes the post's overall status from everyone's. */
export async function saveReview(postId: string, input: ReviewInput, reviewer: string): Promise<{ review: Review | null; people: PersonReview[] }> {
  const db = await getDb();
  await db.collection<HistoryDoc>(COLLECTIONS.history).insertOne({ postId, ...input, reviewer, action: "saved", at: new Date() });
  const people = await peopleFor(postId);
  const review = overallFrom(postId, people);
  const reviews = db.collection<ReviewDoc>(COLLECTIONS.reviews);
  if (review) {
    const { updatedAt, ...rest } = review;
    await reviews.updateOne({ postId }, { $set: { ...rest, updatedAt: new Date(updatedAt) }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  } else {
    await reviews.deleteOne({ postId });
  }
  return { review, people };
}

export async function resetReview(postId: string, reviewer: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.reviews).deleteOne({ postId });
  await db.collection<HistoryDoc>(COLLECTIONS.history).insertOne({
    postId,
    action: "reset",
    status: "pending",
    reviewer,
    feedback: "",
    remarks: "",
    at: new Date(),
  });
}
