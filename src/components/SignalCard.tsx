import { fmtPrice, fmtR, timeAgo } from "@/lib/format";
import type { Signal } from "@/lib/types";

export const STATUS_LABEL: Record<Signal["status"], string> = {
  open: "Open",
  tp: "TP hit",
  sl: "SL hit",
  expired: "Expired",
};

export const MODE_LABEL: Record<Signal["mode"], string> = { swing: "Swing", scalping: "Scalping" };

export default function SignalCard({
  s, active, onSelect,
}: { s: Signal; active: boolean; onSelect: (id: string) => void }) {
  const side = s.side.toLowerCase();
  return (
    <button className={`sig ${side} ${active ? "active" : ""}`} onClick={() => onSelect(s.id)}>
      <div className="sig-top">
        <span className={`side ${side}`}>{s.side}</span>
        <span className={`badge ${s.mode}`}>{MODE_LABEL[s.mode]} · {s.entry_tf}</span>
        <span className={`status ${s.status}`}>{STATUS_LABEL[s.status]}</span>
      </div>
      <div className="sig-levels mono">
        <div><label>Entry</label><b>{fmtPrice(s.entry)}</b></div>
        <div><label>SL</label><b className="neg">{fmtPrice(s.sl)}</b></div>
        <div><label>TP</label><b className="pos">{fmtPrice(s.tp)}</b></div>
      </div>
      <div className="sig-foot">
        <span>{timeAgo(s.created_at)}</span>
        <span>R:R 1:{s.rr}</span>
        {s.r_result !== null && s.status !== "open" && (
          <span className={s.r_result > 0 ? "pos" : s.r_result < 0 ? "neg" : ""}>{fmtR(s.r_result)}</span>
        )}
      </div>
    </button>
  );
}
