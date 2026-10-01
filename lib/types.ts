export type Channel = "company" | "founder";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type SourceType = "fact" | "conditional" | "insight" | "strategic" | "none";

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
  reviewer: string;
  feedback: string;
  remarks: string;
}
