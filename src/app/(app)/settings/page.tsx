"use client";

import { useEffect, useState } from "react";
import { DEFAULTS, SCALP_PRESETS, TFS, type ModeConfig, type Settings, type TF } from "@/lib/settings";

function NumInput({
  value, onChange, step = 1, min, max,
}: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => {
    if (parseFloat(txt) !== value) setTxt(String(value)); // sync when changed from outside (presets, reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="number" inputMode="decimal" step={step} min={min} max={max} value={txt}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)}><i /></button>
  );
}

function TfSelect({ value, onChange }: { value: TF; onChange: (t: TF) => void }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as TF)}>
      {TFS.map((t) => <option key={t}>{t}</option>)}
    </select>
  );
}

function ModeEditor({
  title, blurb, cfg, onChange, presets,
}: {
  title: string; blurb: string; cfg: ModeConfig; onChange: (c: ModeConfig) => void; presets?: boolean;
}) {
  const set = <K extends keyof ModeConfig>(k: K, v: ModeConfig[K]) => onChange({ ...cfg, [k]: v });
  const badOrder = TFS.indexOf(cfg.trend_tf) <= TFS.indexOf(cfg.entry_tf);
  return (
    <section className={`panel mode-card ${cfg.enabled ? "" : "disabled"}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p className="muted small">{blurb}</p>
        </div>
        <Toggle on={cfg.enabled} onChange={(v) => set("enabled", v)} label={`${title} enabled`} />
      </div>

      {presets && (
        <div className="chips preset-row">
          {SCALP_PRESETS.map((p) => (
            <button key={p.label} type="button"
              className={`chip ${cfg.entry_tf === p.entry_tf && cfg.trend_tf === p.trend_tf ? "active" : ""}`}
              onClick={() => onChange({ ...cfg, entry_tf: p.entry_tf, trend_tf: p.trend_tf })}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="form-grid">
        <Field label="Entry timeframe" hint="Candle that triggers the signal">
          <TfSelect value={cfg.entry_tf} onChange={(v) => set("entry_tf", v)} />
        </Field>
        <Field label="Trend timeframe" hint="Bigger picture filter">
          <TfSelect value={cfg.trend_tf} onChange={(v) => set("trend_tf", v)} />
        </Field>
        <Field label="Stop loss (× ATR)" hint="Distance = this × ATR(14)">
          <NumInput value={cfg.sl_atr} step={0.1} min={0.2} max={5} onChange={(v) => set("sl_atr", v)} />
        </Field>
        <Field label="Reward : risk" hint="TP = this × stop distance">
          <NumInput value={cfg.rr} step={0.1} min={0.5} max={10} onChange={(v) => set("rr", v)} />
        </Field>
        <Field label="Max spread ($)" hint="Skip when spread is wider">
          <NumInput value={cfg.max_spread} step={0.05} min={0} max={10} onChange={(v) => set("max_spread", v)} />
        </Field>
        <Field label="Min ATR ($)" hint="Skip dead, flat markets (0 = off)">
          <NumInput value={cfg.min_atr} step={0.1} min={0} max={50} onChange={(v) => set("min_atr", v)} />
        </Field>
        <Field label="Cooldown (min)" hint="Gap between two signals">
          <NumInput value={cfg.cooldown_min} step={1} min={0} max={1440} onChange={(v) => set("cooldown_min", v)} />
        </Field>
        <Field label="Expire after (h)" hint="Close as 'expired' if neither level hit">
          <NumInput value={cfg.expire_hours} step={0.5} min={0.25} max={168} onChange={(v) => set("expire_hours", v)} />
        </Field>
      </div>
      {badOrder && <div className="banner warn">Trend timeframe should be higher than the entry timeframe.</div>}
    </section>
  );
}

const localHour = (h: number) =>
  new Date(Date.UTC(2000, 0, 1, h % 24)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        if (r.status === 401) return void (window.location.href = "/login");
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
        setS(j);
        setSaved(j);
      } catch (e) {
        setMsg({ kind: "err", text: `Can’t load settings: ${e instanceof Error ? e.message : "error"}` });
      }
    })();
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      setS(j);
      setSaved(j);
      setMsg({ kind: "ok", text: "Saved. The bot picks this up within about 30 seconds." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    }
    setBusy(false);
  }

  if (!s) {
    return msg ? <div className="banner err">{msg.text}</div> : <div className="empty"><p>Loading settings…</p></div>;
  }
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="muted small">Changes apply to the Python bot on its next sync (~30 s). No restart needed.</p>
        </div>
        <div className="actions">
          <button className="btn ghost" disabled={!dirty || busy} onClick={() => setS(saved)}>Discard</button>
          <button className="btn gold" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>

      {msg && <div className={`banner ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

      <div className="cards-2">
        <ModeEditor
          title="Swing signal"
          blurb="Trend pullback: EMA50/200 trend, entry on a pullback to EMA50 with RSI turning back through 50."
          cfg={s.swing}
          onChange={(c) => setS({ ...s, swing: c })}
        />
        <ModeEditor
          title="Scalping signal"
          blurb="Fast momentum: EMA20/50 trend, entry on an EMA9/21 cross above/below daily VWAP with RSI in range."
          cfg={s.scalping}
          onChange={(c) => setS({ ...s, scalping: c })}
          presets
        />
      </div>

      <section className="panel">
        <div className="panel-head"><div><h2>General</h2><p className="muted small">Applies to both signal types.</p></div></div>
        <div className="form-grid three">
          <Field label="Telegram alerts" hint="Sent from your PC, using the token in backend/.env">
            <Toggle on={s.telegram_enabled} onChange={(v) => setS({ ...s, telegram_enabled: v })} label="Telegram alerts" />
          </Field>
          <Field label="Session start (UTC hour)" hint={`${localHour(s.session_start_utc)} your time`}>
            <NumInput value={s.session_start_utc} min={0} max={23} onChange={(v) => setS({ ...s, session_start_utc: v })} />
          </Field>
          <Field label="Session end (UTC hour)" hint={`${localHour(s.session_end_utc)} your time`}>
            <NumInput value={s.session_end_utc} min={1} max={24} onChange={(v) => setS({ ...s, session_end_utc: v })} />
          </Field>
        </div>
        <div className="note-row">
          <button className="btn ghost sm" onClick={() => setS(DEFAULTS)}>Reset everything to defaults</button>
        </div>
      </section>
    </>
  );
}
