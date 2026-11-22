"use client";

import type { Trade } from "@/lib/engine";
import { monthLabel, pct, price as fmtPrice } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";

const STOCK = "#ffb547";
const MARKET = "#9ba6c4";
const UP = "#3cc6a8";
const DOWN = "#ff6b57";

function niceTicks(lo: number, hi: number, count = 4) {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Monthly price chart up to the current month. The rest of the era stays blank so the
 * future isn't spoiled. Hover for any month's price and news; markers show your trades.
 */
export function PriceChart({
  ticker,
  series,
  months,
  month,
  trades,
  events,
  spy,
  height = 150,
  big = false,
}: {
  ticker: string;
  series: (number | null)[];
  months: string[];
  month: number;
  trades: Trade[];
  events: { month: string; headline: string }[];
  spy?: (number | null)[];
  height?: number;
  big?: boolean;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const compare = !!spy;
  // Show what has happened plus a few blank months ahead, so early rounds aren't squeezed into a corner.
  const last = Math.min(months.length - 1, Math.max(month + 6, 12));
  const pad = { l: big ? 52 : 40, r: 12, t: 10, b: big ? 26 : 22 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;

  const first = series.findIndex((v) => v != null);
  const base = first >= 0 ? series[first]! : null;
  const spyBase = spy && first >= 0 ? (spy.slice(first).find((v) => v != null) ?? null) : null;
  // In compare mode both lines are indexed to 100 at the stock's first month, on one axis.
  const val = (v: number | null, b: number | null) => (v == null ? null : compare ? (b ? (v / b) * 100 : null) : v);
  const pts = useMemo(() => series.slice(0, month + 1).map((v) => val(v, base)), [series, month, base, compare]); // eslint-disable-line react-hooks/exhaustive-deps
  const mkt = useMemo(() => (spy ? spy.slice(0, month + 1).map((v, i) => (i < first ? null : val(v, spyBase))) : []), [spy, month, first, spyBase, compare]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = [...pts, ...mkt].filter((v): v is number => v != null);
  const lo0 = all.length ? Math.min(...all) : 0;
  const hi0 = all.length ? Math.max(...all) : 1;
  const padY = (hi0 - lo0) * 0.12 || hi0 * 0.1 || 1;
  const lo = Math.max(0, lo0 - padY);
  const hi = hi0 + padY;
  const x = (i: number) => pad.l + (last ? (i / last) * iw : 0);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const line = path(pts);
  const lastIdx = pts.reduce<number>((a, v, i) => (v != null ? i : a), -1);
  const area = line && first >= 0 && lastIdx >= 0 ? `${line}L${x(lastIdx)} ${pad.t + ih}L${x(first)} ${pad.t + ih}Z` : "";
  const ticks = niceTicks(lo, hi, big ? 5 : 3);
  const xTicks = [...new Set(big ? [0, Math.round(last / 4), Math.round(last / 2), Math.round((3 * last) / 4), last] : [0, last])];
  const pastEvents = events.map((e) => ({ ...e, i: months.indexOf(e.month) })).filter((e) => e.i >= 0 && e.i <= month);
  const marks = trades.filter((t) => t.ticker === ticker && t.month <= month);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * last);
    setHover(i >= 0 && i <= month ? i : null);
  };

  const h = hover;
  const hv = h != null ? series[h] : null;
  const hEvent = h != null ? events.find((e) => e.month === months[h]) : undefined;
  const hTrades = h != null ? marks.filter((t) => t.month === h) : [];
  const tipLeft = h != null ? Math.min(Math.max(x(h) - 90, 0), width - 180) : 0;
  const fmtAxis = (v: number) => (compare ? `${Math.round(v)}` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v < 10 ? v.toFixed(2) : Math.round(v)}`);

  return (
    <div ref={wrap} className="relative w-full select-none">
      <svg width={width} height={height} role="img" aria-label={`${ticker} monthly price chart through ${monthLabel(months[month])}`}>
        <defs>
          <linearGradient id={`fill-${ticker}-${big}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={STOCK} stopOpacity="0.22" />
            <stop offset="1" stopColor={STOCK} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + iw} y1={y(t)} y2={y(t)} stroke="rgb(186 200 255 / 0.08)" />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={big ? 11 : 10} fill="#66708d" className="num">
              {fmtAxis(t)}
            </text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize={big ? 11 : 10} fill="#66708d" className="num">
            {monthLabel(months[i])}
          </text>
        ))}
        {/* The months still to come */}
        <rect x={x(month)} y={pad.t} width={Math.max(0, x(last) - x(month))} height={ih} fill="rgb(186 200 255 / 0.03)" />
        {pastEvents.map((e) => (
          <line key={e.month} x1={x(e.i)} x2={x(e.i)} y1={pad.t} y2={pad.t + ih} stroke="#66708d" strokeDasharray="2 3" />
        ))}
        {!compare && area && <path d={area} fill={`url(#fill-${ticker}-${big})`} />}
        {compare && <path d={path(mkt)} fill="none" stroke={MARKET} strokeWidth={2} strokeLinejoin="round" />}
        <path d={line} fill="none" stroke={STOCK} strokeWidth={2} strokeLinejoin="round" />
        {marks.map((t, k) => {
          const v = val(series[t.month] ?? t.price, base);
          if (v == null) return null;
          const buying = t.side === "buy" || t.side === "cover";
          const cx = x(t.month);
          const cy = y(v) + (buying ? 11 : -11);
          return (
            <path
              key={k}
              d={buying ? `M${cx} ${cy - 5}L${cx + 5} ${cy + 4}L${cx - 5} ${cy + 4}Z` : `M${cx} ${cy + 5}L${cx + 5} ${cy - 4}L${cx - 5} ${cy - 4}Z`}
              fill={buying ? UP : DOWN}
              stroke="#0d1328"
              strokeWidth={1.5}
            />
          );
        })}
        {lastIdx >= 0 && pts[lastIdx] != null && <circle cx={x(lastIdx)} cy={y(pts[lastIdx]!)} r={4} fill={STOCK} stroke="#0d1328" strokeWidth={2} />}
        {h != null && (
          <g pointerEvents="none">
            <line x1={x(h)} x2={x(h)} y1={pad.t} y2={pad.t + ih} stroke="#eef1fa" strokeOpacity={0.35} />
            {pts[h] != null && <circle cx={x(h)} cy={y(pts[h]!)} r={4.5} fill={STOCK} stroke="#0d1328" strokeWidth={2} />}
            {compare && mkt[h] != null && <circle cx={x(h)} cy={y(mkt[h]!)} r={4} fill={MARKET} stroke="#0d1328" strokeWidth={2} />}
          </g>
        )}
        <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>

      {h != null && (
        <div className="pointer-events-none absolute top-0 z-10 w-[180px] rounded-lg border border-edge bg-panel-solid/95 px-2.5 py-2 text-xs shadow-lg" style={{ left: tipLeft }}>
          <p className="font-bold text-text">{monthLabel(months[h], true)}</p>
          {hv != null ? (
            <p className="num mt-0.5 text-text">
              {fmtPrice(hv)} {base && <span className="text-sub">({pct(hv / base - 1, 0)} since start)</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-sub">Not trading yet</p>
          )}
          {compare && mkt[h] != null && pts[h] != null && (
            <p className="num text-sub">
              S&P 500 {pct(mkt[h]! / 100 - 1, 0)}, {ticker} {pct(pts[h]! / 100 - 1, 0)}
            </p>
          )}
          {hTrades.map((t, k) => (
            <p key={k} className="num text-sub">
              You {t.forced ? "were margin-called and covered" : t.side === "cover" ? "covered" : t.side === "short" ? "shorted" : t.side === "buy" ? "bought" : "sold"} {t.shares.toFixed(2)} sh
            </p>
          ))}
          {hEvent && <p className="mt-1 leading-snug text-glow">{hEvent.headline}</p>}
        </div>
      )}

      {(compare || marks.length > 0) && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-sub">
          {compare && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded" style={{ background: STOCK }} />
                {ticker}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded" style={{ background: MARKET }} />
                S&P 500
              </span>
              <span>Both start at 100</span>
            </>
          )}
          {marks.length > 0 && (
            <>
              <span className="flex items-center gap-1">
                <span style={{ color: UP }}>▲</span> buy or cover
              </span>
              <span className="flex items-center gap-1">
                <span style={{ color: DOWN }}>▼</span> sell or short
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
