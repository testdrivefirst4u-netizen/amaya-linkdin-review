import { getPosts } from "@/lib/data";
import { listSuggestions } from "@/lib/suggestions";
import SuggestionQueue from "@/components/admin/SuggestionQueue";

export const dynamic = "force-dynamic";

export default async function SuggestionsPage() {
  const [suggestions, posts] = await Promise.all([listSuggestions(), getPosts()]);
  return <SuggestionQueue suggestions={suggestions} posts={posts} />;
}
