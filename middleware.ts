import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessEnabled, accessToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (!accessEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (cookie && cookie === (await accessToken())) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Enter the access code to use this app." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
