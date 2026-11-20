import { TFS } from "@/lib/settings";
import { botAuth, fail, noStore } from "@/lib/secure";
import { saveCandles } from "@/lib/store";
import type { Candle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = botAuth(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as { tf?: unknown; candles?: unknown } | null;
  if (!b || typeof b.tf !== "string" || !(TFS as readonly string[]).includes(b.tf)) return fail("bad timeframe");
  if (!Array.isArray(b.candles) || b.candles.length === 0 || b.candles.length > 1000) return fail("bad candles");

  const ok = b.candles.every(
    (c) => Array.isArray(c) && c.length === 5 && c.every((x) => typeof x === "number" && Number.isFinite(x)),
  );
  if (!ok) return fail("each candle must be [time, open, high, low, close]");

  try {
    await saveCandles(b.tf, b.candles as Candle[]);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
