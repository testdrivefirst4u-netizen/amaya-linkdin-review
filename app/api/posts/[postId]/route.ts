import { getHistory, getPost, getReview } from "@/lib/data";
import { fail, handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/posts/:postId -> the post with its current review and review history
export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const post = await getPost(postId);
    if (!post) return fail("No post with that ID.", 404);
    const [review, history] = await Promise.all([getReview(postId), getHistory(postId)]);
    return ok({ post, review, history });
  } catch (err) {
    return handleError(err);
  }
}
