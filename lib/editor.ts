import "server-only";
import { getPosts } from "./data";

/** Pillar and focus suggestions plus the Monday of week 1, for the post editor. */
export async function editorOptions() {
  const posts = await getPosts();
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
  const w1 = posts.find((p) => p.channel === "company" && p.week === 1);
  let weekStart: string | undefined;
  if (w1) {
    const d = new Date(w1.date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    weekStart = d.toISOString().slice(0, 10);
  }
  return {
    pillars: uniq(posts.map((p) => p.pillar)),
    focuses: uniq(posts.map((p) => p.focus)),
    weekStart,
  };
}
