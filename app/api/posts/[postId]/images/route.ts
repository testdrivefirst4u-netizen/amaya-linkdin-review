import { getPost } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { setPostImages } from "@/lib/posts";
import { fail, handleError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// PUT /api/posts/:postId/images (admin)  body: { images } -> replaces just the post's images
export async function PUT(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    await requireAdmin();
    const { postId } = await params;
    const existing = await getPost(postId);
    if (!existing) return fail("No post with that ID.", 404);
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    return ok(await setPostImages(existing, b.images));
  } catch (err) {
    return handleError(err);
  }
}
