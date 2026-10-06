import { getReviewsByPerson } from "@/lib/data";
import { handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/reviews/people -> { [postId]: each person's own latest review }
export async function GET() {
  try {
    return ok(await getReviewsByPerson());
  } catch (err) {
    return handleError(err);
  }
}
