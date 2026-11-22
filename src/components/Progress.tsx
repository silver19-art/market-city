"use client";

import { ERAS } from "@/lib/eras";
import { pct } from "@/lib/format";
import { BADGES, loadProgress, type Progress } from "@/lib/progress";
import { todayKey } from "@/lib/daily";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("market-city-progress", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("market-city-progress", cb);
    window.removeEventListener("storage", cb);
  };
};
const snapshot = () => {
  try {
    return window.localStorage.getItem("market-city-progress") ?? "";
  } catch {
    return "";
  }
};

/** Progress from this browser; null during server rendering so the page hydrates cleanly. */
function useProgress(): Progress | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => (raw === null ? null : loadProgress()), [raw]);
}

export function DailyCard() {
  const p = useProgress();
  const today = useSyncExternalStore(subscribe, () => todayKey(), () => null);
  const played = p && today ? p.daily[today] : undefined;
  return (
    <Link href="/daily" className="group panel mt-10 flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-glow/60">
      <div className="max-w-xl">
        <p className="text-xs font-bold text-glow">New every day</p>
        <p className="sign mt-1 text-3xl font-extrabold">Mystery Market</p>
        <p className="mt-2 text-sub">
          A real two-year stretch of history with the dates and news hidden. Trade the companies, beat the market, guess the era, and see how you rank against everyone who played today.
        </p>
      </div>
      <span className="rounded-xl bg-glow px-5 py-3 text-sm font-extrabold text-night group-hover:brightness-110">
        {played ? `You scored ${pct(played.ret)}. See how you compare` : "Play today's market"}
      </span>
    </Link>
  );
}

export function ProgressPanel() {
  const p = useProgress();
  if (!p || (Object.keys(p.eras).length === 0 && Object.keys(p.daily).length === 0)) return null;
  const beaten = ERAS.filter((e) => p.eras[e.id]?.beat).length;
  const played = ERAS.filter((e) => p.eras[e.id]).length;
  return (
    <section className="panel mt-8 p-6" aria-label="Your progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold">Your progress</h2>
        <p className="num text-sm text-sub">
          Beat the market in {beaten} of {ERAS.length} eras, played {played}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-glow" style={{ width: `${(beaten / ERAS.length) * 100}%` }} />
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map((b) => {
          const got = b.earned(p);
          return (
            <li key={b.id} className={`rounded-xl border p-3 ${got ? "border-own/50 bg-own/10" : "border-edge opacity-55"}`}>
              <p className={`text-sm font-bold ${got ? "text-own" : "text-text"}`}>{b.name}</p>
              <p className="text-xs text-sub">{b.how}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EraProgress({ id }: { id: string }) {
  const p = useProgress();
  const e = p?.eras[id];
  if (!e) return null;
  return (
    <span className={`mt-3 inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-xs font-bold ${e.beat ? "bg-up/15 text-up" : "bg-white/5 text-sub"}`}>
      {e.beat ? "Beat the market" : "Played"}, best {pct(e.best)}
    </span>
  );
}
