"use client";

import { buy, priceAt, sell, type GameState, type Prices, type TradeResult } from "@/lib/engine";
import type { Company } from "@/lib/eras";
import { pct, price, usd } from "@/lib/format";
import { useState } from "react";
import { Sparkline } from "./Sparkline";

export function StockPanel({
  company,
  prices,
  game,
  onTrade,
  onClose,
}: {
  company: Company;
  prices: Prices;
  game: GameState;
  onTrade: (s: GameState) => void;
  onClose: () => void;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [amount, setAmount] = useState("");
  const series = prices[company.ticker] ?? [];
  const now = priceAt(prices, company.ticker, game.month);
  const listed = series[game.month] != null;
  const first = series.find((v) => v != null) ?? null;
  const prev = game.month > 0 ? priceAt(prices, company.ticker, game.month - 1) : null;
  const held = game.shares[company.ticker] ?? 0;
  const heldValue = held * (now ?? 0);
  const cost = game.trades.filter((t) => t.ticker === company.ticker).reduce((a, t) => a + (t.side === "buy" ? 1 : -1) * t.shares * t.price, 0);

  const run = (r: TradeResult, verb: string) => {
    if (r.ok) {
      onTrade(r.state);
      const t = r.state.trades[r.state.trades.length - 1];
      setMsg({ ok: true, text: `${verb} ${t.shares.toFixed(3)} shares at ${price(t.price)} ($5 fee).` });
    } else setMsg({ ok: false, text: r.reason });
  };

  const buyBtn = "num rounded-xl border border-up/40 bg-up/10 px-3 py-2 text-sm font-semibold text-up transition-colors hover:bg-up/20 disabled:opacity-40";
  const sellBtn = "num rounded-xl border border-down/40 bg-down/10 px-3 py-2 text-sm font-semibold text-down transition-colors hover:bg-down/20 disabled:opacity-40";

  return (
    <section className="panel slide-in w-full p-5" aria-label={`${company.name} details`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-sub">
            {company.ticker} · {company.sector}
          </p>
          <h2 className="text-lg font-extrabold tracking-tight">{company.name}</h2>
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
            <span className="num text-3xl font-extrabold tracking-tight">{now ? price(now) : "–"}</span>
            {now && prev && <span className={`num text-sm font-bold ${now >= prev ? "text-up" : "text-down"}`}>{pct(now / prev - 1)} this month</span>}
          </div>
          {now && first && <p className="num text-xs text-sub">{pct(now / first - 1, 0)} since the era began</p>}
          <div className="mt-3">
            <Sparkline values={series.slice(0, game.month + 1)} />
          </div>
        </>
      )}

      {held > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3 text-sm">
          <div>
            <p className="text-[11px] text-dim">You own</p>
            <p className="num font-bold">{held.toFixed(2)} sh</p>
          </div>
          <div>
            <p className="text-[11px] text-dim">Worth</p>
            <p className="num font-bold">{usd(heldValue)}</p>
          </div>
          <div>
            <p className="text-[11px] text-dim">Gain</p>
            <p className={`num font-bold ${heldValue - cost >= 0 ? "text-up" : "text-down"}`}>{usd(heldValue - cost)}</p>
          </div>
        </div>
      )}

      {listed && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[500, 1000, 2500].map((d) => (
              <button key={d} type="button" className={buyBtn} disabled={game.cash < 10} onClick={() => run(buy(game, prices, company.ticker, d), "Bought")}>
                +{usd(d)}
              </button>
            ))}
            <button type="button" className={buyBtn} disabled={game.cash < 10} onClick={() => run(buy(game, prices, company.ticker, game.cash), "Bought")}>
              All in
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={sellBtn} disabled={held <= 0} onClick={() => run(sell(game, prices, company.ticker, (heldValue || 0) / 2), "Sold")}>
              Sell half
            </button>
            <button type="button" className={sellBtn} disabled={held <= 0} onClick={() => run(sell(game, prices, company.ticker, "all"), "Sold")}>
              Sell all
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(amount.replace(/[$,]/g, ""));
              if (Number.isFinite(n) && n > 0) run(buy(game, prices, company.ticker, n), "Bought");
              setAmount("");
            }}
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Custom $ amount"
              aria-label="Custom dollar amount to buy"
              className="num h-10 min-w-0 flex-1 rounded-xl border border-edge bg-white/5 px-3 text-sm placeholder:text-dim focus:border-glow focus:outline-none"
            />
            <button type="submit" className={`${buyBtn} h-10`}>
              Buy
            </button>
          </form>
        </div>
      )}
      {msg && <p className={`mt-3 text-xs ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
    </section>
  );
}
