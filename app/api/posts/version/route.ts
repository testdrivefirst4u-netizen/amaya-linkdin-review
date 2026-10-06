import { getPostsVersion } from "@/lib/data";
import { handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/posts/version -> a short string that changes whenever a post is created, edited or deleted
export async function GET() {
  try {
    return ok({ version: await getPostsVersion() });
  } catch (err) {
    return handleError(err);
  }
}
