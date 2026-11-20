export const fmtPrice = (n: number | null | undefined) =>
  typeof n === "number" ? n.toFixed(2) : "–";

export function fmtR(r: number | null | undefined): string {
  if (typeof r !== "number") return "–";
  return `${r > 0 ? "+" : ""}${r.toFixed(2)}R`;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });

export const ageLabel = (sec: number) =>
  sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${Math.round(sec / 3600)}h`;
