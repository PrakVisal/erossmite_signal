// Pure module (no server imports) so client components can use it too.

export const TFS = ["M1", "M5", "M15", "M30", "H1", "H4"] as const;
export type TF = (typeof TFS)[number];

export interface ModeConfig {
  enabled: boolean;
  entry_tf: TF;
  trend_tf: TF;
  sl_atr: number;
  rr: number;
  max_spread: number;
  cooldown_min: number;
  min_atr: number;
  expire_hours: number;
}

export interface Settings {
  telegram_enabled: boolean;
  session_start_utc: number;
  session_end_utc: number;
  swing: ModeConfig;
  scalping: ModeConfig;
}

export const DEFAULTS: Settings = {
  telegram_enabled: true,
  session_start_utc: 7,
  session_end_utc: 21,
  swing: {
    enabled: true, entry_tf: "M15", trend_tf: "H1",
    sl_atr: 1.5, rr: 2, max_spread: 0.5, cooldown_min: 60, min_atr: 0, expire_hours: 24,
  },
  scalping: {
    enabled: true, entry_tf: "M5", trend_tf: "M15",
    sl_atr: 1, rr: 1.5, max_spread: 0.35, cooldown_min: 10, min_atr: 0.5, expire_hours: 3,
  },
};

/** Scalping presets: entry timeframe + the trend timeframe it is filtered by. */
export const SCALP_PRESETS: { label: string; entry_tf: TF; trend_tf: TF }[] = [
  { label: "M1 · fastest", entry_tf: "M1", trend_tf: "M5" },
  { label: "M5 · balanced", entry_tf: "M5", trend_tf: "M15" },
  { label: "M15 · slower", entry_tf: "M15", trend_tf: "H1" },
];

function num(v: unknown, d: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}

function tf(v: unknown, d: TF): TF {
  return (TFS as readonly string[]).includes(v as string) ? (v as TF) : d;
}

function modeCfg(v: unknown, d: ModeConfig): ModeConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : d.enabled,
    entry_tf: tf(o.entry_tf, d.entry_tf),
    trend_tf: tf(o.trend_tf, d.trend_tf),
    sl_atr: num(o.sl_atr, d.sl_atr, 0.2, 5),
    rr: num(o.rr, d.rr, 0.5, 10),
    max_spread: num(o.max_spread, d.max_spread, 0, 10),
    cooldown_min: Math.round(num(o.cooldown_min, d.cooldown_min, 0, 1440)),
    min_atr: num(o.min_atr, d.min_atr, 0, 50),
    expire_hours: num(o.expire_hours, d.expire_hours, 0.25, 168),
  };
}

/** Accepts anything (DB value, request body) and returns a valid, clamped Settings object. */
export function sanitize(input: unknown): Settings {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  let start = Math.round(num(o.session_start_utc, DEFAULTS.session_start_utc, 0, 23));
  let end = Math.round(num(o.session_end_utc, DEFAULTS.session_end_utc, 1, 24));
  if (end <= start) {
    start = DEFAULTS.session_start_utc;
    end = DEFAULTS.session_end_utc;
  }
  return {
    telegram_enabled: typeof o.telegram_enabled === "boolean" ? o.telegram_enabled : DEFAULTS.telegram_enabled,
    session_start_utc: start,
    session_end_utc: end,
    swing: modeCfg(o.swing, DEFAULTS.swing),
    scalping: modeCfg(o.scalping, DEFAULTS.scalping),
  };
}
