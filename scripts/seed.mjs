// Loads the content calendar into MongoDB.
//   npm run seed                 -> insert/update posts and the monthly mix; keeps existing reviews
//   npm run seed:reset-reviews   -> same, and also clears every review and its history
import dns from "node:dns";
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "amaya_linkedin";
const resetReviews = process.argv.includes("--reset-reviews");

if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

// Some Windows setups point Node at a local DNS proxy that refuses SRV lookups; fall back to public resolvers.
const srvHost = uri.match(/^mongodb\+srv:\/\/(?:[^@/]*@)?([^/?]+)/)?.[1];
if (srvHost) {
  await dns.promises.resolveSrv(`_mongodb._tcp.${srvHost}`).catch(() => dns.setServers(["1.1.1.1", "8.8.8.8"]));
}

const { posts, mix } =JSON.parse(await readFile(new URL("../data/calendar.json", import.meta.url), "utf8"));
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  await db.collection("posts").createIndex({ postId: 1 }, { unique: true });
  await db.collection("posts").createIndex({ channel: 1, order: 1 });
  await db.collection("reviews").createIndex({ postId: 1 }, { unique: true });
  await db.collection("review_history").createIndex({ postId: 1, at: -1 });
  await db.collection("settings").createIndex({ key: 1 }, { unique: true });

  const ops = posts.map((p) => ({ replaceOne: { filter: { postId: p.postId }, replacement: p, upsert: true } }));
  const res = await db.collection("posts").bulkWrite(ops);
  const ids = posts.map((p) => p.postId);
  const removed = await db.collection("posts").deleteMany({ postId: { $nin: ids } });

  await db.collection("settings").replaceOne({ key: "monthly-mix" }, mix, { upsert: true });

  if (resetReviews) {
    await db.collection("reviews").deleteMany({});
    await db.collection("review_history").deleteMany({});
  }

  const reviewCount = await db.collection("reviews").countDocuments();
  console.log(
    `Seeded ${posts.length} posts into "${dbName}" (${res.upsertedCount} new, ${res.modifiedCount} updated, ${removed.deletedCount} removed).`,
  );
  console.log(resetReviews ? "All reviews cleared." : `Kept ${reviewCount} existing reviews.`);
} finally {
  await client.close();
}
