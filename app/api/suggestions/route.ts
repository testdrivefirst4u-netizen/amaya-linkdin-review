import { requireAdmin } from "@/lib/auth";
import { listSuggestions } from "@/lib/suggestions";
import { handleError, ok } from "@/lib/http";
import type { SuggestionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/suggestions?status=open|accepted|declined (admin)
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") as SuggestionStatus | null;
    return ok(await listSuggestions(status && ["open", "accepted", "declined"].includes(status) ? { status } : {}));
  } catch (err) {
    return handleError(err);
  }
}
