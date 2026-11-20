"use client";

import { useEffect, useState } from "react";

/** Fetches `url` now and then every `ms`. Pauses while the tab is hidden; sends you to /login on 401. */
export function usePoll<T>(url: string | null, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (!document.hidden) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (r.status === 401) {
            window.location.href = "/login";
            return;
          }
          const j = await r.json().catch(() => null);
          if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
          if (alive) {
            setData(j as T);
            setError(null);
          }
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : "request failed");
        }
      }
      if (alive) timer = setTimeout(tick, ms);
    };

    setData(null);
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [url, ms]);

  return { data, error };
}
