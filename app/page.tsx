import CalendarApp from "@/components/CalendarApp";
import SetupNotice from "@/components/SetupNotice";
import { getMix, getPosts, getReviews } from "@/lib/data";
import { accessEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const [posts, reviews, mix] = await Promise.all([getPosts(), getReviews(), getMix()]);
    if (!posts.length || !mix) return <SetupNotice reason="empty" />;
    return <CalendarApp posts={posts} initialReviews={reviews} mix={mix} canSignOut={accessEnabled()} />;
  } catch (err) {
    console.error(err);
    const missingEnv = err instanceof Error && /MONGODB_URI/.test(err.message);
    return <SetupNotice reason={missingEnv ? "env" : "db"} />;
  }
}
