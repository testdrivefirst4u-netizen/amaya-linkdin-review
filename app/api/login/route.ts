import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { authenticate } from "@/lib/users";
import { fail, handleError } from "@/lib/http";

// POST /api/login  body: { username, password }
export async function POST(req: Request) {
  try {
    let username = "";
    let password = "";
    try {
      const b = await req.json();
      username = String(b?.username ?? "").trim();
      password = String(b?.password ?? "");
    } catch {
      /* empty body */
    }
    if (!username || !password) return fail("Enter your username and password.", 400);
    const user = await authenticate(username, password);
    if (!user) return fail("That username or password isn't right.", 401);

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, await signSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/login -> sign out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
