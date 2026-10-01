import { getHistory, getPost, getReview, parseReviewInput, resetReview, saveReview } from "@/lib/data";
import { fail, handleError, ok } from "@/lib/http";

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

// PUT /api/reviews/:postId  body: { status, reviewer, feedback, remarks }
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    if (!(await getPost(postId))) return fail("No post with that ID.", 404);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail("Send the review as JSON.");
    }
    const review = await saveReview(postId, parseReviewInput(body));
    return ok(review);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/reviews/:postId?reviewer=Name -> clears the review back to "Awaiting review"
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    if (!(await getPost(postId))) return fail("No post with that ID.", 404);
    const reviewer = new URL(req.url).searchParams.get("reviewer") || "";
    await resetReview(postId, reviewer);
    return ok({ postId, reset: true });
  } catch (err) {
    return handleError(err);
  }
}
