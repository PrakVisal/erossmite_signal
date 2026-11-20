import { TFS } from "@/lib/settings";
import { botAuth, fail, noStore } from "@/lib/secure";
import { insertSignal } from "@/lib/store";

export const dynamic = "force-dynamic";

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optNum = (v: unknown) => (finite(v) ? v : null);
const isTf = (v: unknown): v is string => typeof v === "string" && (TFS as readonly string[]).includes(v);

export async function POST(req: Request) {
  const denied = botAuth(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return fail("invalid JSON body");

  if (typeof b.id !== "string" || b.id.length === 0 || b.id.length > 100) return fail("bad id");
  if (b.mode !== "swing" && b.mode !== "scalping") return fail("bad mode");
  if (b.side !== "BUY" && b.side !== "SELL") return fail("bad side");
  if (!finite(b.entry) || !finite(b.sl) || !finite(b.tp) || !finite(b.rr) || !finite(b.bar_time)) {
    return fail("entry, sl, tp, rr and bar_time must be numbers");
  }
  if (!isTf(b.entry_tf) || !isTf(b.trend_tf)) return fail("bad timeframe");
  // SL must be on the losing side and TP on the winning side
  const dir = b.side === "BUY" ? 1 : -1;
  if (dir * (b.entry - b.sl) <= 0 || dir * (b.tp - b.entry) <= 0) return fail("sl/tp on the wrong side of entry");

  try {
    const created = await insertSignal({
      id: b.id,
      mode: b.mode,
      symbol: typeof b.symbol === "string" ? b.symbol.slice(0, 20) : "XAUUSD",
      side: b.side,
      entry: b.entry,
      sl: b.sl,
      tp: b.tp,
      rr: b.rr,
      entry_tf: b.entry_tf,
      trend_tf: b.trend_tf,
      rsi: optNum(b.rsi),
      atr: optNum(b.atr),
      bar_time: Math.round(b.bar_time),
    });
    return Response.json({ created }, { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
