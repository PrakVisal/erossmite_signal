import { q } from "./db";
import { DEFAULTS, sanitize, type Settings } from "./settings";
import type { Candle, Heartbeat, Mode, Signal, SignalStatus, Stats } from "./types";

const SYMBOL = "XAUUSD";

/** bigint/numeric columns are cast so the driver returns JS numbers. */
const SIGNAL_COLS = `id, mode, symbol, side, entry, sl, tp, rr, entry_tf, trend_tf, rsi, atr,
  bar_time::float8 AS bar_time, status, r_result, created_at, closed_at`;

// ---------------------------------------------------------------- settings
export async function getSettings(): Promise<Settings> {
  const rows = await q<{ value: unknown }>(`SELECT value FROM kv WHERE key = 'settings'`);
  return rows.length ? sanitize(rows[0].value) : DEFAULTS;
}

export async function saveSettings(s: Settings): Promise<void> {
  await q(
    `INSERT INTO kv (key, value, updated_at) VALUES ('settings', $1::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(s)],
  );
}

// --------------------------------------------------------------- heartbeat
export async function saveHeartbeat(hb: Heartbeat): Promise<void> {
  await q(
    `INSERT INTO kv (key, value, updated_at) VALUES ('heartbeat', $1::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(hb)],
  );
}

export async function getHeartbeat(): Promise<{ heartbeat: Heartbeat | null; age_sec: number | null }> {
  const rows = await q<{ value: Heartbeat; age: number }>(
    `SELECT value, EXTRACT(EPOCH FROM (now() - updated_at))::float8 AS age FROM kv WHERE key = 'heartbeat'`,
  );
  return rows.length ? { heartbeat: rows[0].value, age_sec: rows[0].age } : { heartbeat: null, age_sec: null };
}

// ----------------------------------------------------------------- signals
export async function listSignals(opts: { mode?: Mode; status?: SignalStatus; limit: number }): Promise<Signal[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.mode) {
    params.push(opts.mode);
    where.push(`mode = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  params.push(opts.limit);
  return q<Signal>(
    `SELECT ${SIGNAL_COLS} FROM signals ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  );
}

export async function listOpenSignals(): Promise<Signal[]> {
  return q<Signal>(`SELECT ${SIGNAL_COLS} FROM signals WHERE status = 'open' ORDER BY created_at LIMIT 50`);
}

export async function getStats(mode?: Mode): Promise<Stats> {
  const rows = await q<Omit<Stats, "win_rate" | "avg_r">>(
    `SELECT
       count(*) FILTER (WHERE status = 'open')::int    AS open,
       count(*) FILTER (WHERE status = 'tp')::int      AS wins,
       count(*) FILTER (WHERE status = 'sl')::int      AS losses,
       count(*) FILTER (WHERE status = 'expired')::int AS expired,
       count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last_24h,
       COALESCE(sum(r_result) FILTER (WHERE status IN ('tp','sl')), 0)::float8 AS total_r
     FROM signals WHERE ($1::text IS NULL OR mode = $1::text)`,
    [mode ?? null],
  );
  const r = rows[0];
  const closed = r.wins + r.losses;
  return { ...r, win_rate: closed ? r.wins / closed : null, avg_r: closed ? r.total_r / closed : null };
}

export async function insertSignal(s: {
  id: string; mode: Mode; symbol: string; side: "BUY" | "SELL"; entry: number; sl: number; tp: number; rr: number;
  entry_tf: string; trend_tf: string; rsi: number | null; atr: number | null; bar_time: number;
}): Promise<boolean> {
  const rows = await q(
    `INSERT INTO signals (id, mode, symbol, side, entry, sl, tp, rr, entry_tf, trend_tf, rsi, atr, bar_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    [s.id, s.mode, s.symbol, s.side, s.entry, s.sl, s.tp, s.rr, s.entry_tf, s.trend_tf, s.rsi, s.atr, s.bar_time],
  );
  return rows.length > 0;
}

export async function closeSignal(id: string, status: "tp" | "sl" | "expired", r: number): Promise<boolean> {
  const rows = await q(
    `UPDATE signals SET status = $2, r_result = $3, closed_at = now()
     WHERE id = $1 AND status = 'open' RETURNING id`,
    [id, status, r],
  );
  return rows.length > 0;
}

// ----------------------------------------------------------------- candles
export async function saveCandles(tf: string, candles: Candle[], symbol = SYMBOL): Promise<void> {
  await q(
    `INSERT INTO candles (symbol, tf, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (symbol, tf) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [symbol, tf, JSON.stringify(candles)],
  );
}

export async function getCandles(tf: string, symbol = SYMBOL): Promise<{ candles: Candle[]; age_sec: number } | null> {
  const rows = await q<{ data: Candle[]; age: number }>(
    `SELECT data, EXTRACT(EPOCH FROM (now() - updated_at))::float8 AS age FROM candles WHERE symbol = $1 AND tf = $2`,
    [symbol, tf],
  );
  return rows.length ? { candles: rows[0].data, age_sec: rows[0].age } : null;
}
