import { fmtR } from "@/lib/format";
import type { Stats } from "@/lib/types";

function Tile({ k, v, s, tone }: { k: string; v: string; s?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className={`v mono ${tone ?? ""}`}>{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}

export default function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="stats">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="tile skeleton" />)}
      </div>
    );
  }
  const closed = stats.wins + stats.losses;
  return (
    <div className="stats">
      <Tile
        k="Win rate"
        v={stats.win_rate === null ? "–" : `${(stats.win_rate * 100).toFixed(0)}%`}
        s={`${stats.wins} TP · ${stats.losses} SL`}
      />
      <Tile
        k="Total result"
        v={closed ? fmtR(stats.total_r) : "–"}
        tone={stats.total_r > 0 ? "pos" : stats.total_r < 0 ? "neg" : undefined}
        s={`${closed} closed`}
      />
      <Tile k="Avg per trade" v={stats.avg_r === null ? "–" : fmtR(stats.avg_r)} s="expectancy" />
      <Tile k="Open now" v={String(stats.open)} s={stats.expired ? `${stats.expired} expired` : "tracking"} />
      <Tile k="Last 24h" v={String(stats.last_24h)} s="signals" />
    </div>
  );
}
