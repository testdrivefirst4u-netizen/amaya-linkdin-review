import type { Post } from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Post dates are calendar dates, so read them in UTC to avoid timezone drift. */
export function parts(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00Z");
  return {
    day: d.getUTCDate(),
    weekday: DAYS[d.getUTCDay()],
    monthShort: MONTHS[d.getUTCMonth()].slice(0, 3),
    monthLabel: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
  };
}

export function displayDate(isoDate: string) {
  const p = parts(isoDate);
  return `${p.day} ${p.monthShort} ${isoDate.slice(0, 4)}`;
}

export function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The text a founder pastes into LinkedIn: copy, CTA and hashtags. */
export function postText(p: Post) {
  const cta = p.cta && !/^No CTA/i.test(p.cta) ? p.cta : "";
  return [p.copy, cta, p.hashtags].filter(Boolean).join("\n\n");
}

export function groupByMonth(posts: Post[]) {
  const groups: { label: string; posts: Post[] }[] = [];
  for (const p of posts) {
    const label = parts(p.date).monthLabel;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.posts.push(p);
    else groups.push({ label, posts: [p] });
  }
  return groups;
}
