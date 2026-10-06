import { getPosts, getReviewsByPerson } from "@/lib/data";
import FounderReviews from "@/components/admin/FounderReviews";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [posts, byPerson] = await Promise.all([getPosts(), getReviewsByPerson()]);
  return <FounderReviews posts={posts} byPerson={byPerson} />;
}
