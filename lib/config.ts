import type { ReviewStatus, SourceType, SuggestionChanges, SuggestionStatus } from "./types";

/** The three founders. Founder posts are written for one of them. */
export const FOUNDERS = ["Arudradev Rao", "Dhruv Badruka", "Tanay Saboo"] as const;

/** Display name for the company page in previews. */
export const COMPANY_NAME = "Amaya by Vera Vita";

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Not approved",
};

export const STATUS_ORDER: ReviewStatus[] = ["pending", "approved", "rejected"];

export const SOURCE_LABEL: Record<SourceType, string> = {
  fact: "Fact — verify",
  conditional: "Conditional",
  insight: "Source insight",
  strategic: "Strategic",
  none: "No claims",
};

export const SUGGESTION_LABEL: Record<SuggestionStatus, string> = {
  open: "Waiting for admin",
  accepted: "Approved and applied",
  declined: "Declined",
};

export const CHANGE_LABEL: Record<keyof SuggestionChanges, string> = {
  hook: "Hook",
  copy: "Post copy",
  cta: "Call to action",
  hashtags: "Hashtags",
};

export const FOUNDER_DOT: Record<string, string> = {
  "Arudradev Rao": "bg-brass",
  "Dhruv Badruka": "bg-sage",
  "Tanay Saboo": "bg-slate",
};

export const LIMITS = {
  feedback: 5000,
  remarks: 5000,
  copy: 10000,
  field: 2000,
  message: 5000,
  images: 10,
  /** Largest image a person can upload, in bytes. */
  imageBytes: 15 * 1024 * 1024,
  password: 8,
};

/** How often the page pulls other reviewers' changes (ms). */
export const POLL_MS = 15000;
