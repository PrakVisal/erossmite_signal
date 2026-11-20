import { botAuth, fail, noStore } from "@/lib/secure";
import { getSettings, listOpenSignals, saveHeartbeat } from "@/lib/store";

export const dynamic = "force-dynamic";

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The bot calls this every ~30s: it reports a heartbeat and receives settings + open signals to track. */
export async function POST(req: Request) {
  const denied = botAuth(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    await saveHeartbeat({
      bid: n(b.bid),
      ask: n(b.ask),
      spread: n(b.spread),
      in_session: b.in_session !== false,
      interval: n(b.interval) ?? 30,
    });
    const [settings, open] = await Promise.all([getSettings(), listOpenSignals()]);
    const open_signals = open.map((s) => ({
      id: s.id, mode: s.mode, side: s.side, entry: s.entry, sl: s.sl, tp: s.tp,
      rr: s.rr, entry_tf: s.entry_tf, bar_time: s.bar_time,
    }));
    return Response.json({ settings, open_signals }, { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
