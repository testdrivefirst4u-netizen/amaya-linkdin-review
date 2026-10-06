import { redirect } from "next/navigation";
import CalendarApp from "@/components/CalendarApp";
import SetupNotice from "@/components/SetupNotice";
import { getMix, getPosts, getReviews, getReviewsByPerson, postsVersionOf } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { countOpenSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");
  try {
    const [posts, reviews, people, mix, openSuggestions] = await Promise.all([
      getPosts(),
      getReviews(),
      getReviewsByPerson(),
      getMix(),
      user.role === "admin" ? countOpenSuggestions() : Promise.resolve(0),
    ]);
    if (!posts.length || !mix) return <SetupNotice reason="empty" />;
    return <CalendarApp posts={posts} postsVersion={postsVersionOf(posts)} initialReviews={reviews} initialPeople={people} mix={mix} user={user} openSuggestions={openSuggestions} />;
  } catch (err) {
    console.error(err);
    const missingEnv = err instanceof Error && /MONGODB_URI/.test(err.message);
    return <SetupNotice reason={missingEnv ? "env" : "db"} />;
  }
}
