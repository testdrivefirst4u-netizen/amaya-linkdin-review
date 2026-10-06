import { getPosts } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { createPost, parsePostInput } from "@/lib/posts";
import { handleError, ok, readJson } from "@/lib/http";

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

// POST /api/posts (admin) -> create a post
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const post = await createPost(parsePostInput(await readJson(req)), admin.name);
    return ok(post, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
