"use client";

import { advance, newGame, portfolioValue, priceAt, STARTING_CASH, type GameState, type Prices } from "@/lib/engine";
import { eraById, type Era } from "@/lib/eras";
import { monthLabel, pct, usd } from "@/lib/format";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CamMode } from "./city/CameraRig";
import { Report } from "./Report";
import { StockPanel } from "./StockPanel";

const City = dynamic(() => import("./City"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sub">Building the city…</div>,
});

interface History {
  months: string[];
  prices: Prices;
  spy: (number | null)[];
  missing: string[];
}

const SPEEDS = [
  { label: "1×", ms: 1500 },
  { label: "2×", ms: 750 },
  { label: "4×", ms: 375 },
];

const VIEWS: { id: CamMode; label: string; hint: string }[] = [
  { id: "tour", label: "Tour", hint: "Circling the city. Drag, scroll or press W to take the controls." },
  { id: "fly", label: "Fly", hint: "W A S D to move, drag to look, Q and E to go down and up, scroll to dive, Shift for speed. V to walk." },
  { id: "walk", label: "Walk", hint: "W A S D to walk the avenues, drag to look up at the towers, Shift to jog. V to fly." },
];

function useHistory(eraId: string) {
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/history?era=${eraId}`, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Couldn’t load prices.");
        setData(d as History);
        setError(null);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [eraId, attempt]);
  return { data, error, retry: () => setAttempt((a) => a + 1) };
}

export function Game({ eraId }: { eraId: string }) {
  const era = eraById(eraId) as Era;
  const { data, error, retry } = useHistory(eraId);
  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="panel max-w-md p-6">
          <p className="font-bold">{error}</p>
          <button type="button" onClick={retry} className="mt-4 rounded-xl bg-glow px-4 py-2 text-sm font-bold text-night">
            Try again
          </button>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center text-center text-sub">
        <div>
          <p className="text-lg font-bold text-text">Loading {era.name}</p>
          <p className="mt-1 text-sm">Fetching real monthly prices for {era.companies.length} companies…</p>
        </div>
      </div>
    );
  return <Board era={era} data={data} />;
}

function Board({ era, data }: { era: Era; data: History }) {
  const { months, prices, spy } = data;
  const companies = useMemo(() => era.companies.filter((c) => prices[c.ticker]), [era, prices]);
  const last = months.length - 1;

  const [game, setGame] = useState<GameState>(newGame);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pauseOnNews, setPauseOnNews] = useState(true);
  const [mode, setMode] = useState<CamMode>("tour");

  const eventsByMonth = useMemo(() => new Map(era.events.map((e) => [e.month, e.headline])), [era]);
  const headline = eventsByMonth.get(months[game.month]);
  const pastNews = era.events.filter((e) => e.month <= months[game.month]).reverse();

  const step = useCallback(() => {
    setGame((g) => {
      if (g.month >= last) return g;
      const next = advance(g, prices);
      if (next.month >= last) {
        setPlaying(false);
        setDone(true);
      } else if (pauseOnNews && eventsByMonth.has(months[next.month])) setPlaying(false);
      return next;
    });
  }, [last, prices, pauseOnNews, eventsByMonth, months]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(step, SPEEDS[speed].ms);
    return () => window.clearInterval(id);
  }, [playing, speed, step]);

  // Keyboard: space to play/pause, right arrow to step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!done) setPlaying((p) => !p);
      } else if (e.code === "ArrowRight" && !playing && !done) step();
      else if (e.code === "KeyV") setMode((m) => (m === "walk" ? "fly" : "walk"));
      else if (e.code === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, playing, step]);

  const value = portfolioValue(game, prices);
  const ret = value / STARTING_CASH - 1;
  const spy0 = spy.find((v) => v != null) ?? null;
  const spyNow = priceAt({ s: spy }, "s", game.month);
  const spyRet = spy0 && spyNow ? spyNow / spy0 - 1 : null;
  const owned = useMemo(() => new Set(Object.keys(game.shares)), [game.shares]);
  const holdings = Object.entries(game.shares)
    .map(([t, n]) => ({ t, v: n * (priceAt(prices, t, game.month) ?? 0) }))
    .sort((a, b) => b.v - a.v);
  const company = companies.find((c) => c.ticker === selected);

  const replay = () => {
    setGame(newGame());
    setDone(false);
    setPlaying(false);
    setSelected(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-0 z-0 isolate">
        <City companies={companies} prices={prices} month={game.month} owned={owned} selected={selected} onSelect={setSelected} mode={mode} onMode={setMode} />
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="panel pointer-events-auto flex items-center gap-4 px-4 py-3">
          <Link href="/" className="text-sm font-extrabold tracking-tight hover:text-glow" aria-label="Back to eras">
            ← Market City
          </Link>
          <div className="h-8 w-px bg-edge" />
          <div>
            <p className="text-[11px] font-semibold text-sub">{era.name}</p>
            <p className="num text-lg leading-tight font-extrabold">{monthLabel(months[game.month], true)}</p>
          </div>
        </div>

        <div className="panel pointer-events-auto grid grid-cols-3 gap-5 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold text-sub">Portfolio</p>
            <p className="num text-lg leading-tight font-extrabold">{usd(value)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-sub">Your return</p>
            <p className={`num text-lg leading-tight font-extrabold ${ret >= 0 ? "text-up" : "text-down"}`}>{pct(ret)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-sub">S&P 500</p>
            <p className={`num text-lg leading-tight font-extrabold ${(spyRet ?? 0) >= 0 ? "text-up" : "text-down"}`}>{spyRet === null ? "–" : pct(spyRet)}</p>
          </div>
        </div>
      </header>

      {/* News */}
      {headline && (
        <div key={months[game.month]} className="panel slide-in absolute top-24 left-1/2 z-20 w-[min(640px,calc(100%-2rem))] -translate-x-1/2 border-glow/40 px-5 py-3 text-center">
          <p className="text-xs font-bold text-glow">Breaking news, {monthLabel(months[game.month])}</p>
          <p className="mt-0.5 font-semibold">{headline}</p>
          {!playing && !done && <p className="mt-1 text-xs text-sub">Paused for the news. Trade if you want, then press play.</p>}
        </div>
      )}

      {/* Left: cash and holdings */}
      <aside className="panel absolute bottom-28 left-4 z-20 hidden w-64 p-4 md:block">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-sub">Cash</p>
          <p className="num font-extrabold">{usd(game.cash)}</p>
        </div>
        <p className="mt-3 text-xs font-semibold text-sub">Holdings</p>
        {holdings.length === 0 ? (
          <p className="mt-1 text-xs text-dim">Click any building to buy shares.</p>
        ) : (
          <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
            {holdings.map((h) => (
              <li key={h.t}>
                <button type="button" onClick={() => setSelected(h.t)} className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-white/5">
                  <span className="flex items-center gap-2 font-bold">
                    <span className="size-2 rounded-full bg-own" />
                    {h.t}
                  </span>
                  <span className="num">{usd(h.v)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pastNews.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold text-sub">News so far</p>
            <ul className="mt-1 max-h-32 space-y-1.5 overflow-y-auto text-xs text-dim">
              {pastNews.map((n) => (
                <li key={n.month}>
                  <span className="num font-semibold text-sub">{monthLabel(n.month)}:</span> {n.headline}
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {/* Right: selected stock */}
      {company && (
        <div className="absolute top-24 right-4 bottom-28 z-20 flex w-[min(360px,calc(100%-2rem))] items-start overflow-y-auto">
          <StockPanel key={company.ticker} company={company} prices={prices} game={game} onTrade={setGame} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* Bottom controls */}
      <footer className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-4">
        <div className="panel flex w-full max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={done}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-glow text-night transition-transform hover:scale-105 disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
              </svg>
            )}
          </button>
          <div className="flex rounded-xl bg-white/5 p-1" role="radiogroup" aria-label="Speed">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={speed === i}
                onClick={() => setSpeed(i)}
                className={`num rounded-lg px-2.5 py-1 text-xs font-bold ${speed === i ? "bg-white/15 text-text" : "text-sub hover:text-text"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="min-w-40 flex-1">
            <div className="flex justify-between text-[11px] text-sub">
              <span className="num">{monthLabel(months[0])}</span>
              <span className="num">{last - game.month} months left</span>
              <span className="num">{monthLabel(months[last])}</span>
            </div>
            <div className="relative mt-1 h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-glow" style={{ width: `${(game.month / last) * 100}%` }} />
              {era.events.map((e) => {
                const i = months.indexOf(e.month);
                return i < 0 ? null : <span key={e.month} title={e.headline} className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-text/70" style={{ left: `${(i / last) * 100}%` }} />;
              })}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-sub">
            <input type="checkbox" checked={pauseOnNews} onChange={(e) => setPauseOnNews(e.target.checked)} className="accent-[var(--color-glow)]" />
            Pause on news
          </label>
          <button type="button" onClick={() => setDone(true)} className="rounded-xl border border-edge-strong px-3 py-2 text-xs font-bold hover:bg-white/5">
            End round
          </button>
          <div className="flex w-full flex-wrap items-center gap-3 border-t border-edge pt-3">
            <div className="flex rounded-xl bg-white/5 p-1" role="radiogroup" aria-label="Camera">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === v.id}
                  onClick={(e) => {
                    setMode(v.id);
                    e.currentTarget.blur();
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${mode === v.id ? "bg-glow text-night" : "text-sub hover:text-text"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="min-w-0 flex-1 text-xs text-sub">{VIEWS.find((v) => v.id === mode)?.hint}</p>
          </div>
        </div>
      </footer>

      {game.month === 0 && !playing && !selected && !done && mode === "tour" && (
        <div className="panel slide-in absolute top-28 left-4 z-30 w-[min(400px,calc(100%-2rem))] p-6">
          <p className="num text-xs font-bold text-glow">{era.years}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{era.name}</h1>
          <p className="mt-2 text-sub">{era.pitch}</p>
          <p className="mt-4 text-sm text-sub">
            You have <strong className="text-text">{usd(STARTING_CASH)}</strong>. Click a tower to buy or sell, then press play. Each trade costs $5.
          </p>
          <button type="button" onClick={() => setPlaying(true)} className="mt-5 rounded-xl bg-glow px-5 py-2.5 text-sm font-extrabold text-night hover:brightness-110">
            Start the clock
          </button>
          <p className="mt-3 text-[11px] text-dim">Space plays or pauses, the right arrow steps one month. Fly with W A S D and drag to look, or press V to walk the streets.</p>
        </div>
      )}

      {done && <Report era={era} game={game} prices={prices} spy={spy} months={months} onReplay={replay} />}
    </div>
  );
}
