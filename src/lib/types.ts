export type Mode = "swing" | "scalping";
export type SignalStatus = "open" | "tp" | "sl" | "expired";

export interface Signal {
  id: string;
  mode: Mode;
  symbol: string;
  side: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  entry_tf: string;
  trend_tf: string;
  rsi: number | null;
  atr: number | null;
  bar_time: number;
  status: SignalStatus;
  r_result: number | null;
  created_at: string;
  closed_at: string | null;
}

/** [time, open, high, low, close]  (time = broker-server epoch seconds) */
export type Candle = [number, number, number, number, number];

export interface Stats {
  open: number;
  wins: number;
  losses: number;
  expired: number;
  last_24h: number;
  total_r: number;
  win_rate: number | null;
  avg_r: number | null;
}

export interface Heartbeat {
  bid: number | null;
  ask: number | null;
  spread: number | null;
  in_session: boolean;
  interval: number;
}

export interface StatusResponse {
  heartbeat: Heartbeat | null;
  age_sec: number | null;
}
