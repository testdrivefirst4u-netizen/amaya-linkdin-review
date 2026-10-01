import { getPosts } from "@/lib/data";
import { handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/posts?channel=company|founder
export async function GET(req: Request) {
  try {
    const channel = new URL(req.url).searchParams.get("channel");
    const posts = await getPosts();
    return ok(channel ? posts.filter((p) => p.channel === channel) : posts);
  } catch (err) {
    return handleError(err);
  }
}
