import dns from "node:dns";
import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _amayaMongo: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _amayaIndexes: Promise<void> | undefined;
}

export const COLLECTIONS = {
  posts: "posts",
  reviews: "reviews",
  history: "review_history",
  settings: "settings",
  users: "users",
  suggestions: "suggestions",
} as const;

/**
 * Some Windows setups point Node at a local DNS proxy that refuses SRV lookups,
 * which breaks mongodb+srv:// URIs. If the SRV record can't be resolved, fall back to public resolvers.
 */
async function ensureSrvResolvable(uri: string) {
  const host = uri.match(/^mongodb\+srv:\/\/(?:[^@/]*@)?([^/?]+)/)?.[1];
  if (!host) return;
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  } catch {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
  }
}

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  // Reuse one connection across hot reloads and requests.
  if (!global._amayaMongo) {
    global._amayaMongo = ensureSrvResolvable(uri)
      .then(() => new MongoClient(uri, { maxPoolSize: 10 }).connect())
      .catch((err) => {
        global._amayaMongo = undefined;
        throw err;
      });
  }
  return global._amayaMongo;
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(process.env.MONGODB_DB || "amaya_linkedin");
  if (!global._amayaIndexes) {
    global._amayaIndexes = ensureIndexes(db).catch((err) => {
      global._amayaIndexes = undefined;
      throw err;
    });
  }
  await global._amayaIndexes;
  return db;
}

export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection(COLLECTIONS.posts).createIndex({ postId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.posts).createIndex({ channel: 1, order: 1 }),
    db.collection(COLLECTIONS.reviews).createIndex({ postId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.history).createIndex({ postId: 1, at: -1 }),
    db.collection(COLLECTIONS.settings).createIndex({ key: 1 }, { unique: true }),
    db.collection(COLLECTIONS.users).createIndex({ username: 1 }, { unique: true }),
    db.collection(COLLECTIONS.suggestions).createIndex({ postId: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.suggestions).createIndex({ status: 1, createdAt: -1 }),
  ]);
}
