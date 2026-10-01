import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessCode, accessEnabled, accessToken } from "@/lib/auth";

// POST /api/login  body: { code }
export async function POST(req: Request) {
  if (!accessEnabled()) return NextResponse.json({ ok: true });
  let code = "";
  try {
    code = String((await req.json())?.code ?? "").trim();
  } catch {
    /* empty body */
  }
  if (!code || code !== accessCode()) {
    return NextResponse.json({ error: "That access code isn't right. Check it with BroaddCast." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, await accessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

// DELETE /api/login -> sign out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
