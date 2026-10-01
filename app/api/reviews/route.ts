import { getReviews } from "@/lib/data";
import { handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/reviews -> every saved review (posts without one are awaiting review)
export async function GET() {
  try {
    return ok(await getReviews());
  } catch (err) {
    return handleError(err);
  }
}
