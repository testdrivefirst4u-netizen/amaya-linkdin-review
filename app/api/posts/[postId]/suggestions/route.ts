import { getPost } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { createSuggestion, listSuggestions, parseSuggestionInput } from "@/lib/suggestions";
import { fail, handleError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ postId: string }> };

// GET /api/posts/:postId/suggestions -> every suggestion on the post, newest first
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    return ok(await listSuggestions({ postId }));
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/posts/:postId/suggestions  body: { message, changes: { hook, copy, cta, hashtags }, images }
export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    const post = await getPost(postId);
    if (!post) return fail("No post with that ID.", 404);
    const suggestion = await createSuggestion(postId, user.name, parseSuggestionInput(await readJson(req), post));
    return ok(suggestion, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
