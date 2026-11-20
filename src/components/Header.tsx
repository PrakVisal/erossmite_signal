"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePoll } from "@/hooks/usePoll";
import { ageLabel, fmtPrice } from "@/lib/format";
import type { StatusResponse } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

function botState(s: StatusResponse | null): { cls: string; text: string } {
  if (!s) return { cls: "never", text: "Checking bot…" };
  if (!s.heartbeat || s.age_sec === null) return { cls: "never", text: "Bot never connected" };
  const { interval, in_session } = s.heartbeat;
  if (s.age_sec > interval * 2.5 + 10) return { cls: "offline", text: `Bot offline · seen ${ageLabel(s.age_sec)} ago` };
  if (!in_session) return { cls: "idle", text: "Bot idle · session closed" };
  return { cls: "online", text: "Bot online" };
}

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const { data } = usePoll<StatusResponse>("/api/status", 5000);
  const st = botState(data);
  const hb = data?.heartbeat;

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="9" width="4" height="9" rx="1" fill="#2ebd85" />
            <rect x="10" y="4" width="4" height="12" rx="1" fill="#e8b84a" />
            <rect x="17" y="7" width="4" height="10" rx="1" fill="#f6465d" />
          </svg>
          <span>XAU/USD <em>Signals</em></span>
        </Link>

        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>{n.label}</Link>
          ))}
        </nav>

        <div className="topbar-right">
          {hb && hb.bid !== null && (
            <span className="price mono" title="Last price reported by the bot">{fmtPrice(hb.bid)}</span>
          )}
          <span className={`pill ${st.cls}`}><i />{st.text}</span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
