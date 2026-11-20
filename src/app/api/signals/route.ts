import type { NextRequest } from "next/server";
import { fail, noStore } from "@/lib/secure";
import { listSignals } from "@/lib/store";
import type { Mode, SignalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODES = ["swing", "scalping"];
const STATUSES = ["open", "tp", "sl", "expired"];

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("mode");
  const status = p.get("status");
  if (mode && !MODES.includes(mode)) return fail("bad mode");
  if (status && !STATUSES.includes(status)) return fail("bad status");
  const limit = Math.min(500, Math.max(1, Number(p.get("limit")) || 50));
  try {
    const signals = await listSignals({
      mode: (mode as Mode) || undefined,
      status: (status as SignalStatus) || undefined,
      limit,
    });
    return Response.json({ signals }, { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
