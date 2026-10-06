import "server-only";
import bcrypt from "bcryptjs";
import { COLLECTIONS, getDb } from "./mongodb";
import { LIMITS } from "./config";
import { ValidationError } from "./data";
import type { Role, SessionUser } from "./types";

type UserDoc = { username: string; name: string; role: Role; passwordHash: string; createdAt: Date; updatedAt: Date };

export interface UserSummary extends SessionUser {
  /** ISO timestamp of the last password change */
  updatedAt: string;
}

export async function authenticate(username: string, password: string): Promise<SessionUser | null> {
  const db = await getDb();
  const doc = await db.collection<UserDoc>(COLLECTIONS.users).findOne({ username: username.trim().toLowerCase() });
  if (!doc || !(await bcrypt.compare(password, doc.passwordHash))) return null;
  return { username: doc.username, name: doc.name, role: doc.role };
}

export async function listUsers(): Promise<UserSummary[]> {
  const db = await getDb();
  const docs = await db.collection<UserDoc>(COLLECTIONS.users).find({}).sort({ role: 1, name: 1 }).toArray();
  return docs.map((d) => ({ username: d.username, name: d.name, role: d.role, updatedAt: new Date(d.updatedAt).toISOString() }));
}

export async function setPassword(username: string, password: unknown): Promise<void> {
  if (typeof password !== "string" || password.length < LIMITS.password) {
    throw new ValidationError(`Passwords need at least ${LIMITS.password} characters.`);
  }
  if (password.length > 200) throw new ValidationError("That password is too long.");
  const db = await getDb();
  const res = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .updateOne({ username }, { $set: { passwordHash: await bcrypt.hash(password, 10), updatedAt: new Date() } });
  if (!res.matchedCount) throw new ValidationError("No user with that username.");
}
