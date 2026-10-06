"use client";

import { useState } from "react";
import { SOURCE_LABEL, STATUS_LABEL, SUGGESTION_LABEL } from "@/lib/config";
import type { ReviewStatus, SourceType, SuggestionStatus } from "@/lib/types";

const STATUS_CLASS: Record<ReviewStatus, string> = {
  pending: "bg-wait-bg text-wait-fg",
  approved: "bg-ok-bg text-ok-fg",
  rejected: "bg-no-bg text-no-fg",
};

export function StatusChip({ status }: { status: ReviewStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2.5 pr-3 text-[12px] font-medium ${STATUS_CLASS[status]}`}>
      <span className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

const SUGGESTION_CLASS: Record<SuggestionStatus, string> = {
  open: "bg-wait-bg text-wait-fg",
  accepted: "bg-ok-bg text-ok-fg",
  declined: "bg-none-bg text-none-fg",
};

export function SuggestionChip({ status }: { status: SuggestionStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${SUGGESTION_CLASS[status]}`}>
      {SUGGESTION_LABEL[status]}
    </span>
  );
}

const SOURCE_CLASS: Record<SourceType, string> = {
  fact: "bg-fact-bg text-fact-fg",
  conditional: "bg-cond-bg text-cond-fg",
  insight: "bg-insight-bg text-insight-fg",
  strategic: "bg-strat-bg text-strat-fg",
  none: "bg-none-bg text-none-fg",
};

export function SourceBadge({ type }: { type: SourceType }) {
  return (
    <span className={`whitespace-nowrap rounded-sq px-2 py-0.5 text-[11.5px] font-medium ${SOURCE_CLASS[type]}`}>
      {SOURCE_LABEL[type]}
    </span>
  );
}

/** Copies text; falls back to a hidden textarea where the Clipboard API is blocked. */
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let done = false;
    try {
      done = document.execCommand("copy");
    } catch {
      done = false;
    }
    ta.remove();
    return done;
  }
}

export function CopyButton({ text, label, doneLabel = "Copied" }: { text: () => string; label: string; doneLabel?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  return (
    <button
      type="button"
      className="btn px-3 py-1.5 text-[12.5px]"
      onClick={async () => {
        const ok = await copyToClipboard(text());
        setState(ok ? "done" : "fail");
        setTimeout(() => setState("idle"), 1600);
      }}
    >
      {state === "done" ? doneLabel : state === "fail" ? "Couldn't copy" : label}
    </button>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-[22px] w-[22px] text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
