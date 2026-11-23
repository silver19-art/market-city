"use client";

import { DAILY_MS_PER_MONTH, puzzleNumber, type Puzzle } from "@/lib/daily";
import { advance, buy, cover, newGame, portfolioValue, priceAt, sell, short, STARTING_CASH, type GameState, type TradeResult } from "@/lib/engine";
import { pct, usd } from "@/lib/format";
import { clockLabel, useCountdown } from "@/lib/use-countdown";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { EndProps } from "./Game";
import { LogoMark } from "./Logo";

/**
 * The daily game on a phone: a 2D grid of big stock tiles and a bottom sheet for trading,
 * on the same 60-second clock as the 3D city.
 */
export function DailyMobile({ puzzle, renderEnd }: { puzzle: Puzzle; renderEnd: (p: EndProps) => ReactNode }) {
  const { prices, spy, companies } = puzzle;
  const last = puzzle.months.length - 1;
  const [game, setGame] = useState<GameState>(newGame);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [endOpen, setEndOpen] = useState(true);
  const [sheet, setSheet] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const step = useCallback(() => {
    setGame((g) => {
      if (g.month >= last) return g;
      const next = advance(g, prices);
      if (next.month >= last) {
        setPlaying(false);
        setDone(true);
        setSheet(null);
      }
      return next;
    });
  }, [last, prices]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(step, DAILY_MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [playing, step]);

  const value = portfolioValue(game, prices);
  const ret = value / STARTING_CASH - 1;
  const m0 = spy.find((v) => v != null) ?? null;
  const mNow = priceAt({ m: spy }, "m", game.month);
  const marketRet = m0 && mNow ? mNow / m0 - 1 : 0;
  const secondsLeft = useCountdown(Math.round((last * DAILY_MS_PER_MONTH) / 1000), playing, done);

  const run = (r: TradeResult, verb: string) => {
    if (r.ok) {
      setGame(r.state);
      setMsg({ ok: true, text: verb });
    } else setMsg({ ok: false, text: r.reason });
  };

  const selected = companies.find((c) => c.ticker === sheet) ?? null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-3 pt-3 pb-40">
      <header className="sticky top-0 z-20 -mx-3 bg-night/90 px-3 pt-2 pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2" aria-label="Market City home">
            <LogoMark size={28} />
            <span className="sign text-lg font-extrabold">Mystery Market #{puzzleNumber(puzzle.day)}</span>
          </Link>
          <span className={`num rounded-xl px-3 py-1 text-2xl font-extrabold ${secondsLeft <= 10 && playing ? "bg-down/20 text-down" : "bg-white/10 text-text"}`} aria-live="off">
            {clockLabel(secondsLeft)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Portfolio" value={usd(value)} />
          <Stat label="You" value={pct(ret)} tone={ret >= 0 ? "up" : "down"} />
          <Stat label="Market" value={pct(marketRet)} tone={marketRet >= 0 ? "up" : "down"} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="num shrink-0 text-xs text-sub">Cash {usd(game.cash)}</span>
          <div className="h-1.5 flex-1 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-glow transition-[width] duration-500 ease-linear" style={{ width: `${(game.month / last) * 100}%` }} />
          </div>
          <span className="num shrink-0 text-xs text-sub">
            Month {game.month + 1}/{last + 1}
          </span>
        </div>
      </header>

      <ul className="mt-1 grid grid-cols-2 gap-2">
        {companies.map((c) => {
          const s = prices[c.ticker];
          const p = priceAt(prices, c.ticker, game.month);
          const listed = s[game.month] != null;
          const first = s.find((v) => v != null) ?? null;
          const prev = game.month > 0 ? priceAt(prices, c.ticker, game.month - 1) : null;
          const since = p && first ? p / first - 1 : 0;
          const month = p && prev ? p / prev - 1 : 0;
          const held = game.shares[c.ticker] ?? 0;
          return (
            <li key={c.ticker}>
              <button
                type="button"
                disabled={!listed || done}
                onClick={() => {
                  setSheet(c.ticker);
                  setMsg(null);
                }}
                className={`w-full rounded-xl border p-3 text-left transition-colors active:scale-[0.98] disabled:opacity-50 ${
                  held > 0 ? "border-own/60 bg-own/10" : held < 0 ? "border-down/60 bg-down/10" : "border-edge bg-panel"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="min-w-0 truncate text-sm font-bold">{c.name}</span>
                  {held !== 0 && <span className={`shrink-0 text-[10px] font-bold ${held > 0 ? "text-own" : "text-down"}`}>{held > 0 ? "OWN" : "SHORT"}</span>}
                </div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div>
                    <p className={`num text-lg leading-none font-extrabold ${since >= 0 ? "text-up" : "text-down"}`}>{listed ? pct(since, 0) : "Soon"}</p>
                    <p className={`num mt-1 text-[11px] ${month >= 0 ? "text-up/80" : "text-down/80"}`}>{listed && game.month > 0 ? `${pct(month)} mo` : c.sector}</p>
                  </div>
                  <Spark series={s} month={game.month} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Trade sheet */}
      {selected && !done && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg rounded-t-2xl border-t border-edge-strong bg-panel-solid p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-sub">{selected.sector}</p>
              <p className="text-lg font-extrabold">{selected.name}</p>
            </div>
            <button type="button" onClick={() => setSheet(null)} className="rounded-lg px-3 py-1 text-xl text-sub" aria-label="Close">
              ✕
            </button>
          </div>
          <Position game={game} ticker={selected.ticker} price={priceAt(prices, selected.ticker, game.month)} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Act tone="up" onClick={() => run(buy(game, prices, selected.ticker, 1000), "Bought $1,000")} disabled={(game.shares[selected.ticker] ?? 0) < 0 || game.cash < 10}>
              Buy $1k
            </Act>
            <Act tone="up" onClick={() => run(buy(game, prices, selected.ticker, 2500), "Bought $2,500")} disabled={(game.shares[selected.ticker] ?? 0) < 0 || game.cash < 10}>
              Buy $2.5k
            </Act>
            <Act tone="up" onClick={() => run(buy(game, prices, selected.ticker, game.cash), "All in")} disabled={(game.shares[selected.ticker] ?? 0) < 0 || game.cash < 10}>
              All in
            </Act>
            <Act tone="down" onClick={() => run(sell(game, prices, selected.ticker, "all"), "Sold it all")} disabled={(game.shares[selected.ticker] ?? 0) <= 0}>
              Sell all
            </Act>
            <Act tone="down" onClick={() => run(short(game, prices, selected.ticker, 1000), "Shorted $1,000")} disabled={(game.shares[selected.ticker] ?? 0) > 0}>
              Short $1k
            </Act>
            <Act tone="up" onClick={() => run(cover(game, prices, selected.ticker, "all"), "Covered")} disabled={(game.shares[selected.ticker] ?? 0) >= 0}>
              Cover
            </Act>
          </div>
          {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
        </div>
      )}

      {!playing && !done && game.month === 0 && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-night/70 p-3 backdrop-blur-sm sm:place-items-center">
          <div className="panel w-full max-w-lg bg-panel-solid p-6">
            <p className="text-xs font-bold text-glow">Mystery Market #{puzzleNumber(puzzle.day)}</p>
            <h1 className="sign mt-1 text-3xl font-extrabold">60 seconds. Two years. Beat the market.</h1>
            <p className="mt-3 text-sub">
              A real stretch of US market history with the dates hidden. Every {puzzle.source === "industries" ? "industry" : "stock"} starts at $100. You have $10,000, and the clock never stops: tap a tile to buy, sell or short as the months fly by.
            </p>
            <button type="button" onClick={() => setPlaying(true)} className="mt-5 h-14 w-full rounded-xl bg-glow text-lg font-extrabold text-night active:brightness-110">
              Start
            </button>
            <p className="mt-3 text-center text-[11px] text-dim">Each trade costs $5. The time period is revealed at the end.</p>
          </div>
        </div>
      )}

      {done && !endOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => setEndOpen(true)} className="h-14 w-full rounded-xl bg-glow text-lg font-extrabold text-night">
            Show results
          </button>
        </div>
      )}
      {done && endOpen && renderEnd({ game, onClose: () => setEndOpen(false), onReplay: () => {} })}
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-1.5">
      <p className="text-[10px] text-sub">{label}</p>
      <p className={`num text-base font-extrabold ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text"}`}>{value}</p>
    </div>
  );
}

function Act({ children, onClick, disabled, tone }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone: "up" | "down" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 rounded-xl border text-sm font-bold active:scale-[0.97] disabled:opacity-30 ${tone === "up" ? "border-up/40 bg-up/15 text-up" : "border-down/40 bg-down/15 text-down"}`}
    >
      {children}
    </button>
  );
}

function Position({ game, ticker, price }: { game: GameState; ticker: string; price: number | null }) {
  const n = game.shares[ticker] ?? 0;
  if (!n || !price) return <p className="mt-1 text-sm text-sub">You don&apos;t hold this yet.</p>;
  return (
    <p className="num mt-1 text-sm">
      {n > 0 ? "You own" : "You're short"} <strong>{usd(Math.abs(n * price))}</strong>
    </p>
  );
}

/** Tiny price line up to the current month. */
function Spark({ series, month }: { series: (number | null)[]; month: number }) {
  const pts = series.slice(0, month + 1);
  const vals = pts.filter((v): v is number => v != null);
  if (vals.length < 2) return <svg width="56" height="24" aria-hidden />;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const n = series.length - 1;
  const d = pts
    .map((v, i) => (v == null ? null : `${(i / n) * 56},${22 - ((v - lo) / (hi - lo || 1)) * 20}`))
    .filter(Boolean)
    .map((p, i) => `${i ? "L" : "M"}${p}`)
    .join("");
  const up = vals[vals.length - 1] >= vals[0];
  return (
    <svg width="56" height="24" aria-hidden>
      <path d={d} fill="none" stroke={up ? "#3cc6a8" : "#ff6b57"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
