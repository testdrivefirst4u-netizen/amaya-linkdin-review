// Optional access-code gate. Works in both the Edge middleware and Node route handlers.
export const ACCESS_COOKIE = "amaya_access";

export function accessCode(): string {
  return (process.env.ACCESS_CODE || "").trim();
}

export function accessEnabled(): boolean {
  return accessCode().length > 0;
}

/** Cookie value = SHA-256 of the access code, so the code itself never sits in the browser. */
export async function accessToken(code = accessCode()): Promise<string> {
  const bytes = new TextEncoder().encode(`amaya-linkedin-review:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
