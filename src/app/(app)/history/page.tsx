"use client";

import { useMemo, useState } from "react";
import StatsBar from "@/components/StatsBar";
import { MODE_LABEL, STATUS_LABEL } from "@/components/SignalCard";
import { usePoll } from "@/hooks/usePoll";
import { fmtPrice, fmtR, fmtTime } from "@/lib/format";
import type { Signal, SignalStatus, Stats } from "@/lib/types";

type ModeF = "all" | "swing" | "scalping";
type StatusF = "all" | SignalStatus;

/** Cumulative R over closed trades, oldest to newest. */
function EquityCurve({ signals }: { signals: Signal[] }) {
  const closed = useMemo(
    () =>
      signals
        .filter((s) => (s.status === "tp" || s.status === "sl") && s.r_result !== null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [signals],
  );
  if (closed.length < 2) {
    return <p className="muted small">The result curve appears once at least two trades have closed.</p>;
  }
  let sum = 0;
  const pts = [0, ...closed.map((s) => (sum += s.r_result as number))];
  const min = Math.min(...pts, 0);
  const max = Math.max(...pts, 0);
  const span = max - min || 1;
  const W = 1200, H = 160, PX = 12, PY = 24;
  const x = (i: number) => PX + (i / (pts.length - 1)) * (W - 2 * PX);
  const y = (v: number) => H - PY - ((v - min) / span) * (H - 2 * PY);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label="Cumulative result in R">
      <line x1={PX} x2={W - PX} y1={y(0)} y2={y(0)} stroke="#2a323c" strokeDasharray="4 4" />
      <polyline points={line} fill="none" stroke={up ? "#2ebd85" : "#f6465d"} strokeWidth="2.5" strokeLinejoin="round" />
      <text x={W - PX} y={Math.max(14, y(pts[pts.length - 1]) - 10)} textAnchor="end" fill={up ? "#2ebd85" : "#f6465d"} fontSize="15" fontWeight="600">
        {fmtR(pts[pts.length - 1])}
      </text>
    </svg>
  );
}

export default function HistoryPage() {
  const [mode, setMode] = useState<ModeF>("all");
  const [status, setStatus] = useState<StatusF>("all");

  const q = `limit=300${mode === "all" ? "" : `&mode=${mode}`}${status === "all" ? "" : `&status=${status}`}`;
  const rows = usePoll<{ signals: Signal[] }>(`/api/signals?${q}`, 20000);
  const stats = usePoll<Stats>(`/api/stats${mode === "all" ? "" : `?mode=${mode}`}`, 20000);
  const list = rows.data?.signals ?? [];

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {(["all", "swing", "scalping"] as ModeF[]).map((m) => (
            <button key={m} className={`tab ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
              {m === "all" ? "All" : MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as StatusF)} aria-label="Status filter">
          <option value="all">All results</option>
          <option value="open">Open</option>
          <option value="tp">TP hit</option>
          <option value="sl">SL hit</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <StatsBar stats={stats.data} />
      {rows.error && <div className="banner err">Can’t load history: {rows.error}</div>}

      <section className="panel">
        <div className="panel-head"><h2>Cumulative result</h2><span className="muted small">in R (1R = amount risked per trade)</span></div>
        <EquityCurve signals={list} />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>All signals</h2><span className="muted small">{list.length} rows</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th><th>Mode</th><th>Side</th><th>TF</th>
                <th className="num">Entry</th><th className="num">SL</th><th className="num">TP</th>
                <th className="num">R:R</th><th>Result</th><th className="num">R</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{fmtTime(s.created_at)}</td>
                  <td><span className={`badge ${s.mode}`}>{MODE_LABEL[s.mode]}</span></td>
                  <td><span className={`side ${s.side.toLowerCase()}`}>{s.side}</span></td>
                  <td>{s.entry_tf}/{s.trend_tf}</td>
                  <td className="num mono">{fmtPrice(s.entry)}</td>
                  <td className="num mono neg">{fmtPrice(s.sl)}</td>
                  <td className="num mono pos">{fmtPrice(s.tp)}</td>
                  <td className="num mono">1:{s.rr}</td>
                  <td><span className={`status ${s.status}`}>{STATUS_LABEL[s.status]}</span></td>
                  <td className={`num mono ${s.r_result && s.r_result > 0 ? "pos" : s.r_result && s.r_result < 0 ? "neg" : ""}`}>
                    {s.status === "open" ? "–" : fmtR(s.r_result)}
                  </td>
                </tr>
              ))}
              {rows.data && list.length === 0 && (
                <tr><td colSpan={10} className="empty-cell">No signals match these filters yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted small note">
          Results are replayed from M1 candles. If one candle touches both SL and TP, it counts as a loss.
          Spread and slippage are not included, so real results will be slightly worse.
        </p>
      </section>
    </>
  );
}
