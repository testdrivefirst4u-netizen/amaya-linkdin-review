import type { ReviewStatus, SourceType } from "./types";

/** People who can sign off a review. Edit this list to add or rename reviewers. */
export const REVIEWERS = ["Arudradev Rao", "Dhruv Badruka", "Tanay Saboo", "BroaddCast team"] as const;

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

export const FOUNDER_DOT: Record<string, string> = {
  "Arudradev Rao": "bg-brass",
  "Dhruv Badruka": "bg-sage",
  "Tanay Saboo": "bg-slate",
};

export const LIMITS = { feedback: 5000, remarks: 5000 };

/** How often the page pulls other reviewers' changes (ms). */
export const POLL_MS = 15000;
