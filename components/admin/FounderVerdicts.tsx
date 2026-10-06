import { FOUNDERS } from "@/lib/config";
import { formatTimestamp } from "@/lib/format";
import type { PersonReview } from "@/lib/types";

/** "pending" (only notes, no decision) shows as Not reviewed. */
export const verdictKey = (r?: PersonReview) => (r && r.status !== "pending" ? r.status : "none");

export const VERDICT = {
  approved: { label: "Approved", mark: "✓", cls: "bg-ok-bg text-ok-fg" },
  rejected: { label: "Not approved", mark: "✕", cls: "bg-no-bg text-no-fg" },
  none: { label: "Not reviewed", mark: "–", cls: "bg-none-bg text-muted" },
} as const;

/** Founders first, then anyone else who reviewed (e.g. the admin). */
export function reviewersFor(list: PersonReview[] = []) {
  const others = list.map((r) => r.reviewer).filter((n) => !(FOUNDERS as readonly string[]).includes(n));
  return [...FOUNDERS, ...new Set(others)];
}

/** One pill per founder: "✓ Dhruv", "✕ Tanay", "– Arudradev". */
export function VerdictPills({ list = [] }: { list?: PersonReview[] }) {
  const byName = new Map(list.map((r) => [r.reviewer, r]));
  return (
    <div className="flex flex-wrap gap-1.5">
      {reviewersFor(list).map((name) => {
        const r = byName.get(name);
        const v = VERDICT[verdictKey(r)];
        return (
          <span
            key={name}
            title={`${name}: ${v.label}${r ? ` · ${formatTimestamp(r.at)}` : ""}${r?.feedback ? `\nFeedback: ${r.feedback}` : ""}`}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ${v.cls}`}
          >
            <span aria-hidden>{v.mark}</span>
            {name.split(" ")[0]}
            <span className="sr-only">: {v.label}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Full detail for one person on one post: status, time, feedback and remarks. */
export function VerdictCell({ review }: { review?: PersonReview }) {
  const v = VERDICT[verdictKey(review)];
  return (
    <div className="grid content-start gap-1 text-[13px]">
      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${v.cls}`}>
        <span aria-hidden>{v.mark}</span>
        {v.label}
      </span>
      {review && <span className="text-[11.5px] text-muted">{formatTimestamp(review.at)}</span>}
      {review?.feedback && (
        <p className="line-clamp-3 whitespace-pre-line text-body">
          <span className="font-medium text-navy">Feedback: </span>
          {review.feedback}
        </p>
      )}
      {review?.remarks && (
        <p className="line-clamp-2 whitespace-pre-line text-muted">
          <span className="font-medium text-navy">Remarks: </span>
          {review.remarks}
        </p>
      )}
    </div>
  );
}
