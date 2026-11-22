"use client";

import { buy, cover, portfolioValue, priceAt, sell, short, shortLiability, SHORT_LIMIT, type GameState, type Prices, type TradeResult } from "@/lib/engine";
import type { Company } from "@/lib/eras";
import { monthLabel, pct, price, usd } from "@/lib/format";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PriceChart } from "./PriceChart";

type Side = "long" | "short";

export function StockPanel({
  company,
  prices,
  months,
  events,
  spy,
  game,
  onTrade,
  onClose,
}: {
  company: Company;
  prices: Prices;
  months: string[];
  events: { month: string; headline: string }[];
  spy: (number | null)[];
  game: GameState;
  onTrade: (s: GameState) => void;
  onClose: () => void;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [expanded, setExpanded] = useState(false);
  const held = game.shares[company.ticker] ?? 0;
  const [side, setSide] = useState<Side>(held < 0 ? "short" : "long");
  const series = prices[company.ticker] ?? [];
  const now = priceAt(prices, company.ticker, game.month);
  const listed = series[game.month] != null;
  const first = series.find((v) => v != null) ?? null;
  const prev = game.month > 0 ? priceAt(prices, company.ticker, game.month - 1) : null;
  const posValue = held * (now ?? 0);

  // Net dollars put in (long) or taken out (short) on the current position, for its gain.
  const mine = game.trades.filter((t) => t.ticker === company.ticker);
  const basis = mine.reduce((a, t) => a + (t.side === "buy" || t.side === "cover" ? 1 : -1) * t.shares * t.price, 0);
  const gain = posValue - basis;
  const room = Math.max(0, SHORT_LIMIT * portfolioValue(game, prices) - shortLiability(game, prices));

  const run = (r: TradeResult, verb: string) => {
    if (r.ok) {
      onTrade(r.state);
      const t = r.state.trades[r.state.trades.length - 1];
      setMsg({ ok: true, text: `${verb} ${t.shares.toFixed(3)} shares at ${price(t.price)} ($5 fee).` });
    } else setMsg({ ok: false, text: r.reason });
  };

  const btn = "num rounded-xl border px-2 py-2 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40";
  const upBtn = `${btn} border-up/40 bg-up/10 text-up hover:bg-up/20`;
  const downBtn = `${btn} border-down/40 bg-down/10 text-down hover:bg-down/20`;

  return (
    <section className="panel slide-in w-full p-5" aria-label={`${company.name} details`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-sub">
            {company.ticker}, {company.sector}
          </p>
          <h2 className="text-xl font-extrabold">{company.name}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sub hover:bg-white/5 hover:text-text" aria-label="Close">
          ✕
        </button>
      </div>

      {!listed ? (
        <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-sub">Not trading yet. This company goes public later in the era.</p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="num text-3xl font-extrabold">{now ? price(now) : "–"}</span>
            {now && prev && <span className={`num text-sm font-bold ${now >= prev ? "text-up" : "text-down"}`}>{pct(now / prev - 1)} this month</span>}
          </div>
          {now && first && <p className="num text-xs text-sub">{pct(now / first - 1, 0)} since the era began</p>}
          <div className="mt-3">
            <PriceChart ticker={company.ticker} series={series} months={months} month={game.month} trades={game.trades} events={events} />
          </div>
          <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-xs font-bold text-glow hover:underline">
            Open full chart
          </button>
        </>
      )}

      {held !== 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3 text-sm">
          <div>
            <p className="text-[11px] text-dim">{held > 0 ? "You own" : "You're short"}</p>
            <p className="num font-bold">{Math.abs(held).toFixed(2)} sh</p>
          </div>
          <div>
            <p className="text-[11px] text-dim">{held > 0 ? "Worth" : "You owe"}</p>
            <p className="num font-bold">{usd(Math.abs(posValue))}</p>
          </div>
          <div>
            <p className="text-[11px] text-dim">Gain</p>
            <p className={`num font-bold ${gain >= 0 ? "text-up" : "text-down"}`}>{usd(gain)}</p>
          </div>
        </div>
      )}

      {listed && (
        <>
          <div className="mt-4 grid grid-cols-2 rounded-xl bg-white/5 p-1" role="tablist" aria-label="Trade type">
            {(["long", "short"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={side === s}
                onClick={() => {
                  setSide(s);
                  setMsg(null);
                }}
                className={`rounded-lg py-1.5 text-xs font-bold ${side === s ? "bg-white/15 text-text" : "text-sub hover:text-text"}`}
              >
                {s === "long" ? "Buy and sell" : "Short"}
              </button>
            ))}
          </div>

          {side === "long" ? (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 2500].map((d) => (
                  <button key={d} type="button" className={upBtn} disabled={game.cash < 10 || held < 0} onClick={() => run(buy(game, prices, company.ticker, d), "Bought")}>
                    +{usd(d)}
                  </button>
                ))}
                <button type="button" className={upBtn} disabled={game.cash < 10 || held < 0} onClick={() => run(buy(game, prices, company.ticker, game.cash), "Bought")}>
                  All in
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={downBtn} disabled={held <= 0} onClick={() => run(sell(game, prices, company.ticker, posValue / 2), "Sold")}>
                  Sell half
                </button>
                <button type="button" className={downBtn} disabled={held <= 0} onClick={() => run(sell(game, prices, company.ticker, "all"), "Sold")}>
                  Sell all
                </button>
              </div>
              {held < 0 && <p className="text-xs text-sub">You&apos;re short this stock. Cover the short on the Short tab before buying.</p>}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs leading-relaxed text-sub">
                Shorting sells borrowed shares now. You profit if the price falls and lose if it rises, with no limit on how high it can go. You can short up to {usd(room)} more.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 2500].map((d) => (
                  <button key={d} type="button" className={downBtn} disabled={held > 0 || room < 10} onClick={() => run(short(game, prices, company.ticker, d), "Shorted")}>
                    −{usd(d)}
                  </button>
                ))}
                <button type="button" className={downBtn} disabled={held > 0 || room < 10} onClick={() => run(short(game, prices, company.ticker, room), "Shorted")}>
                  Max
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={upBtn} disabled={held >= 0} onClick={() => run(cover(game, prices, company.ticker, Math.abs(posValue) / 2), "Covered")}>
                  Cover half
                </button>
                <button type="button" className={upBtn} disabled={held >= 0} onClick={() => run(cover(game, prices, company.ticker, "all"), "Covered")}>
                  Cover all
                </button>
              </div>
              {held > 0 && <p className="text-xs text-sub">You own this stock. Sell it before shorting.</p>}
            </div>
          )}

          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(amount.replace(/[$,]/g, ""));
              if (Number.isFinite(n) && n > 0) {
                if (side === "long") run(buy(game, prices, company.ticker, n), "Bought");
                else run(short(game, prices, company.ticker, n), "Shorted");
              }
              setAmount("");
            }}
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Custom $ amount"
              aria-label={side === "long" ? "Custom dollar amount to buy" : "Custom dollar amount to short"}
              className="num h-10 min-w-0 flex-1 rounded-xl border border-edge bg-white/5 px-3 text-sm placeholder:text-dim focus:border-glow focus:outline-none"
            />
            <button type="submit" className={`${side === "long" ? upBtn : downBtn} h-10`}>
              {side === "long" ? "Buy" : "Short"}
            </button>
          </form>
        </>
      )}
      {msg && <p className={`mt-3 text-xs ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}

      {expanded && <ChartModal company={company} series={series} months={months} month={game.month} game={game} events={events} spy={spy} onClose={() => setExpanded(false)} />}
    </section>
  );
}

function ChartModal({
  company,
  series,
  months,
  month,
  game,
  events,
  spy,
  onClose,
}: {
  company: Company;
  series: (number | null)[];
  months: string[];
  month: number;
  game: GameState;
  events: { month: string; headline: string }[];
  spy: (number | null)[];
  onClose: () => void;
}) {
  const [compare, setCompare] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const seen = series.slice(0, month + 1).filter((v): v is number => v != null);
  const start = seen[0];
  const nowP = seen[seen.length - 1];
  const high = seen.length ? Math.max(...seen) : null;
  const low = seen.length ? Math.min(...seen) : null;
  const stats: [string, string][] = [
    ["Now", nowP ? price(nowP) : "–"],
    ["Since start", start && nowP ? pct(nowP / start - 1, 0) : "–"],
    ["High so far", high ? price(high) : "–"],
    ["Low so far", low ? price(low) : "–"],
    ["Below its high", high && nowP ? pct(nowP / high - 1, 0) : "–"],
  ];

  // Portaled to <body>: the panel's backdrop blur would otherwise trap a fixed overlay inside it.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${company.name} chart`} onClick={onClose}>
      <div className="panel w-full max-w-4xl bg-panel-solid p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-sub">
              {company.ticker}, monthly closes through {monthLabel(months[month], true)}
            </p>
            <h2 className="text-2xl font-extrabold">{company.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-sub">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-[var(--color-glow)]" />
              Compare with the S&P 500
            </label>
            <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sub hover:bg-white/5 hover:text-text" aria-label="Close chart">
              ✕
            </button>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/5 px-3 py-2">
              <dt className="text-[11px] text-dim">{k}</dt>
              <dd className="num font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <PriceChart ticker={company.ticker} series={series} months={months} month={month} trades={game.trades} events={events} spy={compare ? spy : undefined} height={340} big />
        </div>
        <p className="mt-3 text-xs text-dim">Dashed lines mark the news. The shaded area is the part of the era still to come. Prices are adjusted for splits and dividends.</p>
      </div>
    </div>,
    document.body,
  );
}
