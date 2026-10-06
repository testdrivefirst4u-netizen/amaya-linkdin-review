import { NextResponse } from "next/server";
import { ValidationError } from "./data";
import { AuthError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers || {}) } });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reads a JSON body, or throws a ValidationError the page can show. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Send the request body as JSON.");
  }
}

/** Turns thrown errors into a JSON response the page can show. */
export function handleError(err: unknown) {
  if (err instanceof ValidationError) return fail(err.message, 400);
  if (err instanceof AuthError) return fail(err.message, err.status);
  console.error(err);
  const msg =
    err instanceof Error && /MONGODB_URI|AUTH_SECRET/.test(err.message)
      ? err.message
      : "The server couldn't reach the database. Try again in a moment.";
  return fail(msg, 500);
}
