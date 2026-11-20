// Node-only helpers (route handlers). Do not import from middleware.
import { createHash, timingSafeEqual } from "node:crypto";

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Returns a Response to send back when the bot's bearer token is wrong, or null when it is fine. */
export function botAuth(req: Request): Response | null {
  const key = process.env.INGEST_API_KEY;
  if (!key) return Response.json({ error: "INGEST_API_KEY is not configured on the server" }, { status: 500 });
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return safeEqual(token, key) ? null : Response.json({ error: "unauthorized" }, { status: 401 });
}

export const noStore = { "Cache-Control": "no-store" };

export function fail(error: string, status = 400): Response {
  return Response.json({ error }, { status, headers: noStore });
}
