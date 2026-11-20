"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi, IPriceLine, ISeriesApi, LineData, UTCTimestamp } from "lightweight-charts";
import type { Candle, Signal } from "@/lib/types";

const GREEN = "#2ebd85";
const RED = "#f6465d";
const GOLD = "#e8b84a";
const BLUE = "#5b9cf5";

function emaLine(candles: Candle[], n: number): LineData[] {
  const k = 2 / (n + 1);
  let prev: number | null = null;
  return candles.map((c) => {
    prev = prev === null ? c[4] : c[4] * k + prev * (1 - k);
    return { time: c[0] as UTCTimestamp, value: prev };
  });
}

/** Candles + EMA lines; the selected signal's Entry / SL / TP are drawn as price lines. */
export default function SignalChart({ candles, signal, tf }: { candles: Candle[]; signal: Signal | null; tf: string }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const emaA = useRef<ISeriesApi<"Line"> | null>(null);
  const emaB = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLines = useRef<IPriceLine[]>([]);
  const loadedTf = useRef("");
  const lastTime = useRef(0);
  const [ready, setReady] = useState(false);

  // create the chart once
  useEffect(() => {
    let disposed = false;
    (async () => {
      const lw = await import("lightweight-charts");
      if (disposed || !box.current) return;
      const c = lw.createChart(box.current, {
        autoSize: true,
        layout: { background: { type: lw.ColorType.Solid, color: "transparent" }, textColor: "#8b95a1", fontSize: 12 },
        grid: { vertLines: { color: "#161c22" }, horzLines: { color: "#161c22" } },
        rightPriceScale: { borderColor: "#222a33" },
        timeScale: { borderColor: "#222a33", timeVisible: true, secondsVisible: false, rightOffset: 6 },
        crosshair: { mode: lw.CrosshairMode.Normal },
      });
      candleSeries.current = c.addCandlestickSeries({
        upColor: GREEN, downColor: RED, wickUpColor: GREEN, wickDownColor: RED, borderVisible: false,
      });
      emaA.current = c.addLineSeries({ color: GOLD, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      emaB.current = c.addLineSeries({ color: BLUE, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      chart.current = c;
      setReady(true);
    })();
    return () => {
      disposed = true;
      chart.current?.remove();
      chart.current = null;
      candleSeries.current = null;
      loadedTf.current = "";
      setReady(false);
    };
  }, []);

  // candle data + EMA overlays
  useEffect(() => {
    const s = candleSeries.current;
    if (!ready || !s) return;
    if (candles.length === 0) {
      s.setData([]);
      emaA.current?.setData([]);
      emaB.current?.setData([]);
      loadedTf.current = "";
      return;
    }
    const bars = candles.map((c) => ({
      time: c[0] as UTCTimestamp, open: c[1], high: c[2], low: c[3], close: c[4],
    }));
    if (loadedTf.current !== tf) {
      s.setData(bars);
      loadedTf.current = tf;
    } else {
      for (const b of bars) if (b.time >= lastTime.current) s.update(b); // live tail only, keeps zoom
    }
    lastTime.current = bars[bars.length - 1].time as number;

    const periods = signal?.mode === "scalping" ? [9, 21] : [50];
    emaA.current?.setData(emaLine(candles, periods[0]));
    emaB.current?.setData(periods[1] ? emaLine(candles, periods[1]) : []);
  }, [ready, candles, tf, signal?.mode]);

  // Entry / SL / TP lines, marker and framing: only when the selection or timeframe changes
  const hasData = candles.length > 0;
  useEffect(() => {
    const s = candleSeries.current;
    const c = chart.current;
    if (!ready || !s || !c) return;

    priceLines.current.forEach((l) => s.removePriceLine(l));
    priceLines.current = [];
    s.setMarkers([]);

    if (signal) {
      const line = (price: number, color: string, title: string) =>
        s.createPriceLine({ price, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title });
      priceLines.current = [
        line(signal.entry, "#c9d1d9", "ENTRY"),
        line(signal.sl, RED, "SL"),
        line(signal.tp, GREEN, "TP"),
      ];
      if (candles.some((k) => k[0] === signal.bar_time)) {
        const buy = signal.side === "BUY";
        s.setMarkers([{
          time: signal.bar_time as UTCTimestamp,
          position: buy ? "belowBar" : "aboveBar",
          shape: buy ? "arrowUp" : "arrowDown",
          color: buy ? GREEN : RED,
          text: signal.side,
        }]);
      }
    }
    if (hasData) c.timeScale().setVisibleLogicalRange({ from: candles.length - 90, to: candles.length + 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signal?.id, tf, hasData]);

  return <div ref={box} className="chart-box" />;
}
