import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { LIMITS } from "./config";
import { ValidationError } from "./data";
import type { PostImage } from "./types";

// Browsers upload straight to ImageKit with a short-lived signature from /api/imagekit/auth,
// so image files never pass through this server.

function keys() {
  return {
    publicKey: (process.env.IMAGEKIT_PUBLIC_KEY || "").trim(),
    privateKey: (process.env.IMAGEKIT_PRIVATE_KEY || "").trim(),
    urlEndpoint: (process.env.IMAGEKIT_URL_ENDPOINT || "").trim().replace(/\/+$/, ""),
    folder: "/" + (process.env.IMAGEKIT_FOLDER || "amaya-linkedin").trim().replace(/^\/+|\/+$/g, ""),
  };
}

export function imagekitConfigured() {
  const k = keys();
  return Boolean(k.publicKey && k.privateKey);
}

let keyCheck: { key: string; ok: boolean; at: number } | null = null;

/**
 * Asks ImageKit whether the private key works (cached for 10 minutes), so the uploader can say
 * "the key is wrong" instead of a vague upload error. Returns an error message, or null when fine.
 */
export async function checkKeys(): Promise<string | null> {
  const { privateKey } = keys();
  if (keyCheck && keyCheck.key === privateKey && Date.now() - keyCheck.at < 10 * 60 * 1000) {
    return keyCheck.ok ? null : KEY_ERROR;
  }
  try {
    const res = await fetch("https://api.imagekit.io/v1/files?limit=1", {
      headers: { Authorization: "Basic " + Buffer.from(privateKey + ":").toString("base64") },
      cache: "no-store",
    });
    // Only a clear "not authenticated" counts as a bad key; network hiccups shouldn't block uploads.
    const ok = res.status !== 401 && res.status !== 403;
    keyCheck = { key: privateKey, ok, at: Date.now() };
    return ok ? null : KEY_ERROR;
  } catch {
    return null;
  }
}

const KEY_ERROR =
  "ImageKit rejected the private key, so uploads can't work yet. Copy the private key again from ImageKit (Developer options → API keys) into IMAGEKIT_PRIVATE_KEY and restart the app.";

/** One-time upload signature. ImageKit requires `expire` to be less than an hour away. */
export function uploadAuth() {
  const { publicKey, privateKey, folder } = keys();
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");
  return { token, expire, signature, publicKey, folder };
}

/** Best-effort delete; a failure only leaves an unused file in the ImageKit media library. */
export async function deleteImages(fileIds: string[]) {
  const { privateKey } = keys();
  if (!privateKey || !fileIds.length) return;
  const auth = "Basic " + Buffer.from(privateKey + ":").toString("base64");
  const results = await Promise.allSettled(
    fileIds.map((id) =>
      fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: auth } }),
    ),
  );
  results.forEach((r, i) => {
    if (r.status === "rejected" || (!r.value.ok && r.value.status !== 404)) console.warn(`ImageKit: couldn't delete file ${fileIds[i]}`);
  });
}

function allowedUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const { urlEndpoint } = keys();
  if (urlEndpoint && url.startsWith(urlEndpoint + "/")) return true;
  return u.hostname === "ik.imagekit.io";
}

/** Checks image references sent by the browser: ImageKit URLs only. */
export function parseImages(value: unknown): PostImage[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError("Images must be a list.");
  if (value.length > LIMITS.images) throw new ValidationError(`Add up to ${LIMITS.images} images.`);
  const seen = new Set<string>();
  return value.map((v) => {
    const o = (v ?? {}) as Record<string, unknown>;
    const fileId = typeof o.fileId === "string" ? o.fileId : "";
    const url = typeof o.url === "string" ? o.url : "";
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(fileId) || !allowedUrl(url)) throw new ValidationError("One of the images isn't an ImageKit upload. Upload it again.");
    if (seen.has(fileId)) throw new ValidationError("The same image is added twice.");
    seen.add(fileId);
    const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined);
    return {
      fileId,
      url,
      name: typeof o.name === "string" ? o.name.slice(0, 200) : "",
      width: num(o.width),
      height: num(o.height),
    };
  });
}
