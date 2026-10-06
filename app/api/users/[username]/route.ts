import { requireAdmin } from "@/lib/auth";
import { setPassword } from "@/lib/users";
import { handleError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// PUT /api/users/:username (admin)  body: { password }
export async function PUT(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    await requireAdmin();
    const { username } = await params;
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    await setPassword(username, b.password);
    return ok({ username, updated: true });
  } catch (err) {
    return handleError(err);
  }
}
