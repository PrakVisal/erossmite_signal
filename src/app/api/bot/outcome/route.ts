import { botAuth, fail, noStore } from "@/lib/secure";
import { closeSignal } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = botAuth(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; r_result?: unknown } | null;
  if (!b || typeof b.id !== "string") return fail("bad id");
  if (b.status !== "tp" && b.status !== "sl" && b.status !== "expired") return fail("bad status");
  if (typeof b.r_result !== "number" || !Number.isFinite(b.r_result)) return fail("bad r_result");

  try {
    const updated = await closeSignal(b.id, b.status, b.r_result);
    return Response.json({ updated }, { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
