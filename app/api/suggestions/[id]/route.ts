import { requireAdmin } from "@/lib/auth";
import { decideSuggestion } from "@/lib/suggestions";
import { fail, handleError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// PATCH /api/suggestions/:id (admin)  body: { action: "accept" | "decline", note }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    if (b.action !== "accept" && b.action !== "decline") return fail("Action must be accept or decline.");
    const note = typeof b.note === "string" ? b.note.trim() : "";
    return ok(await decideSuggestion(id, b.action === "accept", admin.name, note));
  } catch (err) {
    return handleError(err);
  }
}
