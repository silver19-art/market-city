"use client";

import { pct } from "@/lib/format";
import { MIN_REAL_PLAYERS, type Standing } from "@/lib/standings";
import { useEffect, useState } from "react";

const W = 640;
const H = 170;
const PAD = { l: 8, r: 8, t: 30, b: 26 };

/** "Better than X% of players" with a smoothed distribution of everyone's returns and a marker for you. */
export function StandingView({ standing, audience }: { standing: Standing | null; audience: string }) {
  if (!standing)
    return <p className="mt-6 text-sm text-sub">Comparisons with other players aren&apos;t available right now. Your score is still saved on this device.</p>;

  const { percentile, total, bins, you, basis, realPlayers } = standing;
  const simulated = basis === "simulated";
  const group = simulated ? `${total} simulated investors` : audience;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const lo = bins[0]?.x0 ?? you - 0.1;
  const hi = bins[bins.length - 1]?.x1 ?? you + 0.1;
  const x = (v: number) => PAD.l + ((v - lo) / (hi - lo || 1)) * iw;
  const max = Math.max(1, ...bins.map((b) => b.count));
  const y = (c: number) => PAD.t + ih - (c / max) * ih;

  // Light smoothing so a handful of players still reads as a curve rather than spikes.
  const smooth = bins.map((b, i) => (0.25 * (bins[i - 1]?.count ?? b.count) + 0.5 * b.count + 0.25 * (bins[i + 1]?.count ?? b.count)));
  const pts = bins.map((b, i) => [x((b.x0 + b.x1) / 2), y(smooth[i])] as const);
  const curve = pts.reduce((d, [px, py], i) => {
    if (i === 0) return `M${PAD.l} ${y(smooth[0])}L${px} ${py}`;
    const [qx, qy] = pts[i - 1];
    const mx = (qx + px) / 2;
    return `${d}C${mx} ${qy} ${mx} ${py} ${px} ${py}`;
  }, "");
  const line = `${curve}L${W - PAD.r} ${y(smooth[smooth.length - 1])}`;
  const area = `${line}L${W - PAD.r} ${PAD.t + ih}L${PAD.l} ${PAD.t + ih}Z`;
  const yx = x(you);
  const ticks = niceTicks(lo, hi);

  return (
    <div className="mt-6">
      <p className="text-center text-lg">
        {percentile === null ? (
          <>You&apos;re the first to finish. Check back as more people play.</>
        ) : (
          <>
            Better than <strong className="num text-2xl font-extrabold text-glow">{Math.round(percentile * 100)}%</strong> of {group}
          </>
        )}
      </p>
      {bins.length > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label={`Distribution of ${group}' returns, with yours at ${pct(you)}`}>
          <defs>
            <linearGradient id="dist-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3cc6a8" stopOpacity="0.45" />
              <stop offset="1" stopColor="#3cc6a8" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#dist-fill)" />
          <path d={line} fill="none" stroke="#3cc6a8" strokeWidth={2} strokeLinejoin="round" />
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} stroke="rgb(186 200 255 / 0.25)" />
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill="#66708d" className="num">
              {pct(t, 0)}
            </text>
          ))}
          <line x1={yx} x2={yx} y1={PAD.t - 4} y2={PAD.t + ih} stroke="#ffb547" strokeWidth={2} strokeDasharray="3 3" />
          <rect x={yx - 18} y={6} width={36} height={18} rx={4} fill="#ffb547" />
          <text x={yx} y={19} textAnchor="middle" fontSize={11} fontWeight={800} fill="#070b17">
            YOU
          </text>
        </svg>
      )}
      {simulated ? (
        <p className="mx-auto max-w-md text-center text-[11px] leading-relaxed text-dim">
          Simulated, not real people: computer investors trading the same real prices with common habits (buy and hold, frequent trading, chasing trends, panic selling). You&apos;ll be compared with real players once {MIN_REAL_PLAYERS} have finished. Real players so far: {realPlayers + 1}.
        </p>
      ) : (
        <p className="text-center text-[11px] text-dim">
          {total} {total === 1 ? "player" : "players"} so far. Returns, with yours at {pct(you)}.
        </p>
      )}
    </div>
  );
}

function niceTicks(lo: number, hi: number) {
  const span = hi - lo;
  const step = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5].find((s) => span / s <= 6) ?? 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/** Time until the next Mystery Market (midnight in New York). */
export function Countdown() {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const next = new Date(ny);
      next.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((next.getTime() - ny.getTime()) / 1000));
      const hh = String(Math.floor(s / 3600)).padStart(2, "0");
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setLeft(`${hh}:${mm}:${ss}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="mt-6 rounded-xl border border-edge bg-white/5 px-4 py-3 text-center">
      <p className="text-xs font-bold text-sub">Next Mystery Market opens in</p>
      <p className="num mt-0.5 text-3xl font-extrabold">{left ?? "--:--:--"}</p>
    </div>
  );
}
