import { getHistory, getPost, getReview } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { deletePost, parsePostInput, updatePost } from "@/lib/posts";
import { fail, handleError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ postId: string }> };

// GET /api/posts/:postId -> the post with its current review and review history
export async function GET(_req: Request, { params }: Ctx) {
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

// PUT /api/posts/:postId (admin) -> replace the post's content. The channel can't change.
export async function PUT(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { postId } = await params;
    const existing = await getPost(postId);
    if (!existing) return fail("No post with that ID.", 404);
    const post = await updatePost(existing, parsePostInput(await readJson(req), existing.channel));
    return ok(post);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/posts/:postId (admin) -> delete the post, its review, suggestions and images
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { postId } = await params;
    const existing = await getPost(postId);
    if (!existing) return fail("No post with that ID.", 404);
    await deletePost(existing);
    return ok({ postId, deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
