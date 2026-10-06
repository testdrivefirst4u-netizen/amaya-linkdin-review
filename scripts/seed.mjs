// Loads the content calendar and the four sign-ins into MongoDB.
//   npm run seed                    -> insert/update posts, the monthly mix and users; keeps reviews and passwords
//   npm run seed:reset-reviews      -> same, and also clears every review, its history and every suggestion
//   npm run seed -- --reset-passwords  -> also resets every password to the SEED_PASSWORD_* values (or new random ones)
// Posts created or edited in the app are never overwritten or removed by seeding.
import dns from "node:dns";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "amaya_linkedin";
const resetReviews = process.argv.includes("--reset-reviews");
const resetPasswords = process.argv.includes("--reset-passwords");

const USERS = [
  { username: "admin", name: "BroaddCast team", role: "admin", env: "SEED_PASSWORD_ADMIN" },
  { username: "arudradev", name: "Arudradev Rao", role: "founder", env: "SEED_PASSWORD_ARUDRADEV" },
  { username: "dhruv", name: "Dhruv Badruka", role: "founder", env: "SEED_PASSWORD_DHRUV" },
  { username: "tanay", name: "Tanay Saboo", role: "founder", env: "SEED_PASSWORD_TANAY" },
];

if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

// Some Windows setups point Node at a local DNS proxy that refuses SRV lookups; fall back to public resolvers.
const srvHost = uri.match(/^mongodb\+srv:\/\/(?:[^@/]*@)?([^/?]+)/)?.[1];
if (srvHost) {
  await dns.promises.resolveSrv(`_mongodb._tcp.${srvHost}`).catch(() => dns.setServers(["1.1.1.1", "8.8.8.8"]));
}

const { posts, mix } = JSON.parse(await readFile(new URL("../data/calendar.json", import.meta.url), "utf8"));
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  await db.collection("posts").createIndex({ postId: 1 }, { unique: true });
  await db.collection("posts").createIndex({ channel: 1, order: 1 });
  await db.collection("reviews").createIndex({ postId: 1 }, { unique: true });
  await db.collection("review_history").createIndex({ postId: 1, at: -1 });
  await db.collection("settings").createIndex({ key: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("suggestions").createIndex({ postId: 1, createdAt: -1 });
  await db.collection("suggestions").createIndex({ status: 1, createdAt: -1 });

  // Posts: skip any the admin has edited in the app, and only remove seed posts dropped from the file.
  const edited = new Set(
    (await db.collection("posts").find({ editedAt: { $exists: true } }, { projection: { postId: 1 } }).toArray()).map((p) => p.postId),
  );
  const fresh = posts.filter((p) => !edited.has(p.postId));
  const ops = fresh.map((p) => ({ replaceOne: { filter: { postId: p.postId }, replacement: { ...p, origin: "seed" }, upsert: true } }));
  const res = ops.length ? await db.collection("posts").bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };
  const ids = posts.map((p) => p.postId);
  const removed = await db.collection("posts").deleteMany({ postId: { $nin: ids }, origin: { $ne: "app" }, editedAt: { $exists: false } });

  await db.collection("settings").replaceOne({ key: "monthly-mix" }, mix, { upsert: true });

  if (resetReviews) {
    await db.collection("reviews").deleteMany({});
    await db.collection("review_history").deleteMany({});
    await db.collection("suggestions").deleteMany({});
  }

  // Users: create missing ones; keep existing passwords unless --reset-passwords.
  const generated = [];
  for (const u of USERS) {
    const existing = await db.collection("users").findOne({ username: u.username });
    const now = new Date();
    if (existing && !resetPasswords) {
      await db.collection("users").updateOne({ username: u.username }, { $set: { name: u.name, role: u.role } });
      continue;
    }
    let password = (process.env[u.env] || "").trim();
    if (!password) {
      password = randomBytes(9).toString("base64url");
      generated.push(`  ${u.username.padEnd(10)} ${password}   (${u.name})`);
    }
    await db.collection("users").updateOne(
      { username: u.username },
      { $set: { name: u.name, role: u.role, passwordHash: await bcrypt.hash(password, 10), updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }

  const reviewCount = await db.collection("reviews").countDocuments();
  console.log(
    `Seeded ${fresh.length} posts into "${dbName}" (${res.upsertedCount} new, ${res.modifiedCount} updated, ${removed.deletedCount} removed, ${edited.size} edited in the app and left alone).`,
  );
  console.log(resetReviews ? "All reviews and suggestions cleared." : `Kept ${reviewCount} existing reviews.`);
  console.log(`Users: ${USERS.map((u) => u.username).join(", ")}${resetPasswords ? " (passwords reset)" : ""}.`);
  if (generated.length) {
    console.log("\nNew passwords (no SEED_PASSWORD_* set). Save these now; they aren't stored anywhere else:");
    console.log(generated.join("\n"));
  }
} finally {
  await client.close();
}
