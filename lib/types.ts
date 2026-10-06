export type Channel = "company" | "founder";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type SourceType = "fact" | "conditional" | "insight" | "strategic" | "none";
export type Role = "admin" | "founder";

/** The signed-in person, as stored in the session cookie. */
export interface SessionUser {
  username: string;
  name: string;
  role: Role;
}

/** An image stored on ImageKit. */
export interface PostImage {
  fileId: string;
  url: string;
  name: string;
  width?: number;
  height?: number;
}

export interface Post {
  postId: string;
  channel: Channel;
  order: number;
  /** ISO date, YYYY-MM-DD */
  date: string;
  topic: string;
  audience: string;
  hook: string;
  copy: string;
  cta: string;
  visual: string;
  hashtags: string;
  source: string;
  sourceType: SourceType;
  // Company page only
  week?: number;
  pillar?: string;
  objective?: string;
  format?: string;
  creative?: string;
  headline?: string;
  // Founder only
  founder?: string;
  focus?: string;
  angle?: string;
  // Added in the app
  images?: PostImage[];
  /** "seed" posts come from data/calendar.json, "app" posts were created by the admin. */
  origin?: "seed" | "app";
  createdBy?: string;
  /** ISO timestamp of the last change made in the app. Seeding skips posts that have one. */
  editedAt?: string;
}

export interface Review {
  postId: string;
  status: ReviewStatus;
  reviewer: string;
  feedback: string;
  remarks: string;
  /** ISO timestamp */
  updatedAt: string;
}

export interface ReviewHistoryEntry {
  id: string;
  postId: string;
  action: "saved" | "reset";
  status: ReviewStatus;
  reviewer: string;
  feedback: string;
  remarks: string;
  /** ISO timestamp */
  at: string;
}

/** One person's own latest review on a post. "pending" means they left only feedback or remarks. */
export interface PersonReview {
  reviewer: string;
  status: ReviewStatus;
  feedback: string;
  remarks: string;
  /** ISO timestamp */
  at: string;
}

export interface MixData {
  intro: string;
  headers: string[];
  rows: { month: string; values: number[] }[];
  notes: string[];
  companyIntro: string;
  founderIntro: string;
}

export interface ReviewInput {
  status: ReviewStatus;
  feedback: string;
  remarks: string;
}

export type SuggestionStatus = "open" | "accepted" | "declined";

/** Wording a founder proposes. Only fields that differ from the post are kept. */
export interface SuggestionChanges {
  hook?: string;
  copy?: string;
  cta?: string;
  hashtags?: string;
}

export interface Suggestion {
  id: string;
  postId: string;
  author: string;
  message: string;
  changes: SuggestionChanges;
  images: PostImage[];
  status: SuggestionStatus;
  /** ISO timestamp */
  createdAt: string;
  decidedBy?: string;
  decidedAt?: string;
  adminNote?: string;
}
