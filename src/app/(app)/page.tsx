"use client";

import { useEffect, useRef, useState } from "react";
import SignalCard, { MODE_LABEL } from "@/components/SignalCard";
import SignalChart from "@/components/SignalChart";
import StatsBar from "@/components/StatsBar";
import { usePoll } from "@/hooks/usePoll";
import { ageLabel, fmtPrice } from "@/lib/format";
import type { Candle, Mode, Signal, Stats } from "@/lib/types";

type Filter = "all" | Mode;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "swing", label: "Swing" },
  { id: "scalping", label: "Scalping" },
];
const CHART_TFS = ["M1", "M5", "M15", "H1"];

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* sound is optional */
  }
}

export default function Dashboard() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [tfPick, setTfPick] = useState<string | null>(null);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    try {
      setSound(localStorage.getItem("xs_sound") === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const modeQ = filter === "all" ? "" : `&mode=${filter}`;
  const signals = usePoll<{ signals: Signal[] }>(
    `/api/signals?limit=40${modeQ}`,
    5000,
  );
  const stats = usePoll<Stats>(
    `/api/stats${filter === "all" ? "" : `?mode=${filter}`}`,
    15000,
  );

  const list = signals.data?.signals ?? [];
  const selected = list.find((s) => s.id === selId) ?? list[0] ?? null;
  const tf = tfPick ?? selected?.entry_tf ?? "M5";
  const candles = usePoll<{ candles: Candle[]; age_sec: number | null }>(
    `/api/candles?tf=${tf}`,
    10000,
  );

  // sound alert when a new signal shows up
  const seen = useRef<{ filter: Filter | null; id: string | null }>({
    filter: null,
    id: null,
  });
  useEffect(() => {
    if (!signals.data) return;
    const top = signals.data.signals[0] ?? null;
    if (seen.current.filter !== filter) {
      seen.current = { filter, id: top?.id ?? null };
      return;
    }
    if (top && top.id !== seen.current.id) {
      seen.current.id = top.id;
      if (sound) beep();
    }
  }, [signals.data, filter, sound]);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem("xs_sound", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (next) beep();
  }

  function pickSignal(id: string) {
    setSelId(id);
    setTfPick(null); // follow the signal's own timeframe
  }

  const risk = selected ? Math.abs(selected.entry - selected.sl) : 0;
  const reward = selected ? Math.abs(selected.tp - selected.entry) : 0;
  const age = candles.data?.age_sec ?? null;

  return (
    <>
      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Signal mode">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`tab ${filter === f.id ? "active" : ""}`}
              onClick={() => {
                setFilter(f.id);
                setSelId(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          className={`btn ghost sm ${sound ? "on" : ""}`}
          onClick={toggleSound}
          aria-pressed={sound}
        >
          {sound ? "🔔 Sound on" : "🔕 Sound off"}
        </button>
      </div>

      <StatsBar stats={stats.data} />

      {signals.error && (
        <div className="banner err">Can’t load signals: {signals.error}</div>
      )}

      <div className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>XAUUSD · {tf}</h2>
              <p className="muted small">
                {age === null
                  ? candles.data
                    ? "No candles yet. Start the Python bot."
                    : "Loading…"
                  : `Updated ${ageLabel(age)} ago · chart time is broker server time`}
              </p>
            </div>
            <div className="chips">
              {CHART_TFS.map((t) => (
                <button
                  key={t}
                  className={`chip ${tf === t ? "active" : ""}`}
                  onClick={() => setTfPick(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <SignalChart
            candles={candles.data?.candles ?? []}
            signal={selected}
            tf={tf}
          />

          {selected && (
            <div className="detail">
              <div className="detail-title">
                <span className={`side ${selected.side.toLowerCase()}`}>
                  {selected.side}
                </span>
                <span className={`badge ${selected.mode}`}>
                  {MODE_LABEL[selected.mode]}
                </span>
                <span className="muted small">
                  {selected.entry_tf} entry · {selected.trend_tf} trend
                </span>
              </div>
              <div className="detail-grid mono">
                <div>
                  <label>Entry</label>
                  <b>{fmtPrice(selected.entry)}</b>
                </div>
                <div>
                  <label>Stop loss</label>
                  <b className="neg">{fmtPrice(selected.sl)}</b>
                </div>
                <div>
                  <label>Take profit</label>
                  <b className="pos">{fmtPrice(selected.tp)}</b>
                </div>
                <div>
                  <label>Risk / Reward</label>
                  <b>
                    ${risk.toFixed(2)} / ${reward.toFixed(2)}
                  </b>
                </div>
                <div>
                  <label>RSI / ATR</label>
                  <b>
                    {selected.rsi ?? "–"} / {selected.atr ?? "–"}
                  </b>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel feed">
          <div className="panel-head">
            <h2>Signals</h2>
            <span className="muted small">{list.length} shown</span>
          </div>
          {signals.data && list.length === 0 && (
            <div className="empty">
              <b>Waiting for the first signal</b>
              <p>
                The bot checks every closed candle during the London + New York
                session. Signals appear here the moment a rule fires.
              </p>
            </div>
          )}
          {!signals.data && !signals.error && (
            <div className="empty">
              <p>Loading…</p>
            </div>
          )}
          <div className="feed-list">
            {list.map((s) => (
              <SignalCard
                key={s.id}
                s={s}
                active={selected?.id === s.id}
                onSelect={pickSignal}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
