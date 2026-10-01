import { getMix } from "@/lib/data";
import { fail, handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/mix -> the monthly content mix table and notes
export async function GET() {
  try {
    const mix = await getMix();
    return mix ? ok(mix) : fail("The content mix hasn't been loaded. Run npm run seed.", 404);
  } catch (err) {
    return handleError(err);
  }
}
