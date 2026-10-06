import { getHistory, getPost, getReview, parseReviewInput, resetReview, saveReview } from "@/lib/data";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ postId: string }> };

// GET /api/reviews/:postId -> current review + history
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    if (!(await getPost(postId))) return fail("No post with that ID.", 404);
    const [review, history] = await Promise.all([getReview(postId), getHistory(postId)]);
    return ok({ review, history });
  } catch (err) {
    return handleError(err);
  }
}

// PUT /api/reviews/:postId  body: { status, feedback, remarks }. Saves the signed-in person's own review.
// Returns { review (the post's overall status), people (everyone's own reviews) }.
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    if (!(await getPost(postId))) return fail("No post with that ID.", 404);
    return ok(await saveReview(postId, parseReviewInput(await readJson(req)), user.name));
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/reviews/:postId (admin) -> clears every founder's review back to "Awaiting review"
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireAdmin();
    const { postId } = await params;
    if (!(await getPost(postId))) return fail("No post with that ID.", 404);
    await resetReview(postId, user.name);
    return ok({ postId, reset: true });
  } catch (err) {
    return handleError(err);
  }
}
