import { getPosts, getReviews, getReviewsByPerson } from "@/lib/data";
import AdminPosts from "@/components/admin/AdminPosts";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [posts, reviews, byPerson] = await Promise.all([getPosts(), getReviews(), getReviewsByPerson()]);
  return <AdminPosts posts={posts} reviews={reviews} byPerson={byPerson} />;
}
