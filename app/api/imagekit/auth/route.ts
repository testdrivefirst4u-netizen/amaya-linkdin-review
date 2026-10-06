import { requireUser } from "@/lib/auth";
import { checkKeys, imagekitConfigured, uploadAuth } from "@/lib/imagekit";
import { fail, handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/imagekit/auth -> one-time signature for a browser upload to ImageKit (signed-in users only)
export async function GET() {
  try {
    await requireUser();
    if (!imagekitConfigured()) return fail("Image uploads aren't set up yet. Add IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY.", 503);
    const keyError = await checkKeys();
    if (keyError) return fail(keyError, 503);
    return ok(uploadAuth());
  } catch (err) {
    return handleError(err);
  }
}
