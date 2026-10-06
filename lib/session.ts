// Signed session cookie. Edge-safe: used by the middleware and by route handlers.
import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser } from "./types";

export const SESSION_COOKIE = "amaya_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = (process.env.AUTH_SECRET || "").trim();
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== "production") return new TextEncoder().encode("amaya-dev-only-secret-set-AUTH_SECRET");
  throw new Error("AUTH_SECRET is not set. Add a long random value under Environment Variables.");
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

/** Returns the user in a valid session cookie, or null. Throws only when AUTH_SECRET is missing in production. */
export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || typeof payload.name !== "string" || (role !== "admin" && role !== "founder")) return null;
    return { username: payload.sub, name: payload.name, role };
  } catch {
    return null;
  }
}
