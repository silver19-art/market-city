"use client";

import { report, type GameState, type Prices } from "@/lib/engine";
import type { Era } from "@/lib/eras";
import { monthLabel, pct, usd } from "@/lib/format";
import Link from "next/link";

function Bar({ label, value, max, you = false }: { label: string; value: number; max: number; you?: boolean }) {
  const w = max > 0 ? Math.max(2, (Math.abs(value) / max) * 100) : 2;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className={you ? "font-bold" : "text-sub"}>{label}</span>
        <span className={`num font-bold ${value >= 0 ? "text-up" : "text-down"}`}>{pct(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/5">
        <div className={`h-full rounded-full ${value >= 0 ? "bg-up" : "bg-down"} ${you ? "" : "opacity-60"}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export function Report({ era, game, prices, spy, months, onReplay }: { era: Era; game: GameState; prices: Prices; spy: (number | null)[]; months: string[]; onReplay: () => void }) {
  const r = report(game, prices, spy, era.companies.map((c) => c.ticker));
  const comps = [r.totalReturn, r.benchmarkReturn ?? 0, r.equalWeightReturn ?? 0];
  const max = Math.max(...comps.map(Math.abs), 0.01);
  const verdict =
    r.benchmarkReturn === null
      ? "Round complete."
      : r.totalReturn > r.benchmarkReturn
        ? `You beat the S&P 500 by ${((r.totalReturn - r.benchmarkReturn) * 100).toFixed(1)} percentage points.`
        : `The S&P 500 beat you by ${((r.benchmarkReturn - r.totalReturn) * 100).toFixed(1)} percentage points.`;

  const lessons: string[] = [era.lesson];
  if (r.trades >= 20) lessons.push(`You made ${r.trades} trades and paid ${usd(r.feesPaid)} in fees. Frequent trading has real costs, and most professionals fail to beat a simple index fund after fees.`);
  if (r.cashShare > 0.4) lessons.push(`${pct(r.cashShare, 0, false)} of your money ended the round in cash. Cash is safe in a crash, but it misses the rebounds that usually follow.`);
  if (r.benchmarkReturn !== null && r.totalReturn > r.benchmarkReturn) lessons.push("Beating the market once can be luck. Over long periods, most stock pickers trail the index, which is why many investors simply buy it.");
  if (r.maxDrawdown > 0.4) lessons.push(`At your worst point you were down ${pct(r.maxDrawdown, 0, false)} from your peak. Ask yourself honestly whether you would have held on with real money.`);
  if (r.marginCalls > 0) lessons.push(`You were margin-called ${r.marginCalls === 1 ? "once" : `${r.marginCalls} times`}. A short can lose more than you put in, because a stock can keep rising, and brokers force you out at the worst moment.`);
  else if (r.shorted) lessons.push("You shorted stocks this round. Shorting pays when prices fall, but markets rise more often than they fall, so short sellers are fighting the long-run trend.");
  lessons.push("Survivorship bias: this city only has companies still trading today, because that's the only free data. Companies that went under, like Enron, WorldCom and Lehman Brothers, aren't here, so real investors faced worse odds than this game.");

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="panel slide-in my-8 w-full max-w-2xl bg-panel-solid p-6 sm:p-8">
        <p className="text-sm font-semibold text-sub">
          {era.name} · {monthLabel(months[0])} to {monthLabel(months[game.month])}
        </p>
        <h2 id="report-title" className="mt-1 text-3xl font-extrabold tracking-tight">
          {usd(r.finalValue)}
        </h2>
        <p className={`mt-1 text-lg font-bold ${r.beatMarket ? "text-up" : "text-glow"}`}>{verdict}</p>

        <div className="mt-6 space-y-4">
          <Bar label="Your portfolio" value={r.totalReturn} max={max} you />
          {r.benchmarkReturn !== null && <Bar label="S&P 500 (SPY), buy and hold" value={r.benchmarkReturn} max={max} />}
          {r.equalWeightReturn !== null && <Bar label="Every company equally, buy and hold" value={r.equalWeightReturn} max={max} />}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Worst drop", pct(-r.maxDrawdown, 0)],
            ["S&P worst drop", r.benchmarkDrawdown !== null ? pct(-r.benchmarkDrawdown, 0) : "–"],
            ["Trades", String(r.trades)],
            ["Fees paid", usd(r.feesPaid)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] text-dim">{k}</dt>
              <dd className="num text-lg font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
        {(r.best || r.worst) && (
          <p className="mt-4 text-sm text-sub">
            {r.best && (
              <>
                {r.worst ? "Best pick" : "Your only pick"}: <strong className={r.best.ret >= 0 ? "text-up" : "text-down"}>{r.best.ticker}</strong> ({pct(r.best.ret, 0)}).{" "}
              </>
            )}
            {r.worst && (
              <>
                Worst pick: <strong className="text-down">{r.worst.ticker}</strong> ({pct(r.worst.ret, 0)}).
              </>
            )}
          </p>
        )}

        <h3 className="mt-7 text-sm font-bold tracking-wide text-glow">What this round teaches</h3>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-sub">
          {lessons.map((l) => (
            <li key={l} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-glow" />
              <span>{l}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={onReplay} className="rounded-xl bg-glow px-5 py-2.5 text-sm font-extrabold text-night hover:brightness-110">
            Play this era again
          </button>
          <Link href="/" className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
            Pick another era
          </Link>
        </div>
        <p className="mt-6 text-[11px] text-dim">Monthly adjusted closing prices. Educational game, not investment advice.</p>
      </div>
    </div>
  );
}
