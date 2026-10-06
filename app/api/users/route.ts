import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/users (admin)
export async function GET() {
  try {
    await requireAdmin();
    return ok(await listUsers());
  } catch (err) {
    return handleError(err);
  }
}
