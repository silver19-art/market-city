"use client";

import { clientId } from "@/lib/client-id";
import { replayScore, type Puzzle, type Reveal } from "@/lib/daily";
import type { Era } from "@/lib/eras";
import { monthLabel, pct } from "@/lib/format";
import { recordDaily, type Badge } from "@/lib/progress";
import type { Standing } from "@/lib/standings";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Board, type EndProps } from "./Game";
import { Countdown, StandingView } from "./StandingView";

interface Result {
  day: string;
  /** The score that counts today (your first finish). */
  ret: number;
  thisRound: number;
  alreadyPlayed: boolean;
  marketRet: number | null;
  guessed: boolean;
  guess: string | null;
  reveal: Reveal;
  standing: Standing | null;
}

const RESULT_KEY = (day: string) => `market-city-daily-${day}`;

function readResult(day: string): Result | null {
  try {
    const raw = window.localStorage.getItem(RESULT_KEY(day));
    return raw ? (JSON.parse(raw) as Result) : null;
  } catch {
    return null;
  }
}

/** The daily Mystery Market: load today's hidden stretch, play it, then submit for the reveal and see how you compare. */
export function Daily() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [replaying, setReplaying] = useState(false);
  // Finished in this visit: keep the city on screen and show the results over it.
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/daily", { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Couldn’t load today’s market.");
        setPuzzle(d as Puzzle);
        setResult(readResult((d as Puzzle).day));
      })
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctrl.abort();
  }, []);

  const era = useMemo<Era | null>(
    () =>
      puzzle && {
        id: "daily",
        name: "Mystery Market",
        years: "Year unknown",
        start: "",
        end: "",
        pitch:
          puzzle.source === "industries"
            ? "A real two-year stretch of US market history from before 1985, so the towers are whole industries. The dates and news are hidden and everything starts at $100. Can you tell when it is?"
            : "A real two-year stretch of US market history since 1985. You know the companies, but the dates and news are hidden and every stock starts at $100. Can you tell when it is?",
        lesson: "",
        companies: puzzle.companies,
        source: puzzle.source,
        events: [],
        benchmark: "MARKET",
      },
    [puzzle],
  );

  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="panel max-w-md p-6">
          <p className="font-bold">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-glow px-4 py-2 text-sm font-bold text-night">
            Try again
          </button>
        </div>
      </div>
    );
  if (!puzzle || !era) return <div className="grid min-h-screen place-items-center text-sub">Loading today’s Mystery Market…</div>;

  if (result && !replaying && !justFinished) return <Results result={result} onReplay={() => setReplaying(true)} />;

  return (
    <Board
      era={era}
      data={{ months: puzzle.months, prices: puzzle.prices, spy: puzzle.spy, missing: [] }}
      renderEnd={(p) =>
        result ? (
          <Results result={result} onClose={p.onClose} practice={replaying} />
        ) : (
          <Finish
            {...p}
            puzzle={puzzle}
            onResult={(r) => {
              setJustFinished(true);
              setResult(r);
            }}
          />
        )
      }
    />
  );
}

function Finish({ game, onClose, puzzle, onResult }: EndProps & { puzzle: Puzzle; onResult: (r: Result) => void }) {
  const trades = game.trades.filter((t) => !t.forced).map((t) => ({ month: t.month, ticker: t.ticker, side: t.side, shares: t.shares }));
  // Score exactly the way the server will: positions are held to the final month.
  const scored = replayScore(trades, puzzle.prices);
  const ret = scored.ok ? scored.ret : 0;
  const endedEarly = game.month < puzzle.months.length - 1;
  const [guess, setGuess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/daily/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day: puzzle.day, clientId: clientId(), guess, trades }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Couldn’t submit. Try again.");
      const r: Result = { ...d, guess };
      try {
        window.localStorage.setItem(RESULT_KEY(puzzle.day), JSON.stringify(r));
      } catch {
        /* fine */
      }
      onResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <p className="text-sm font-semibold text-sub">Mystery Market, {puzzle.day}</p>
      <h2 className="mt-1 text-3xl font-extrabold">
        You finished at <span className={ret >= 0 ? "text-up" : "text-down"}>{pct(ret)}</span>
      </h2>
      {endedEarly && <p className="mt-1 text-sm text-sub">You ended early, so your positions are held to Month {puzzle.months.length} for scoring.</p>}

      <h3 className="mt-6 text-sm font-bold text-glow">Which decade do you think this was?</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Your guess">
        {puzzle.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={guess === c.id}
            onClick={() => setGuess(c.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm ${guess === c.id ? "border-glow bg-glow/15" : "border-edge hover:bg-white/5"}`}
          >
            <span className="font-bold">{c.name}</span> <span className="text-sub">{c.years}</span>
          </button>
        ))}
      </div>

      {err && <p className="mt-3 text-sm text-down">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={!guess || busy} onClick={submit} className="rounded-xl bg-glow px-5 py-2.5 text-sm font-extrabold text-night hover:brightness-110 disabled:opacity-40">
          {busy ? "Checking your trades…" : "Lock in and see how you compare"}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
          Look at the city first
        </button>
      </div>
      <p className="mt-4 text-[11px] text-dim">One score per day. The server replays your trades on the real prices to check it.</p>
    </Modal>
  );
}

function Results({ result, onClose, onReplay, practice = false }: { result: Result; onClose?: () => void; onReplay?: () => void; practice?: boolean }) {
  const [stand, setStand] = useState<Standing | null>(result.standing);
  const [copied, setCopied] = useState(false);
  const [badges] = useState<Badge[]>(() => recordDaily(result.day, result.ret, result.guessed));

  useEffect(() => {
    // The distribution keeps growing as more people finish, so refresh it.
    fetch(`/api/daily/stats?day=${result.day}&me=${encodeURIComponent(clientId())}`)
      .then((r) => r.json())
      .then((d: { standing: Standing | null }) => d.standing && setStand(d.standing))
      .catch(() => {});
  }, [result.day]);

  const share = async () => {
    const better = stand?.percentile != null ? `, better than ${Math.round(stand.percentile * 100)}% of players` : "";
    const text = `Market City Mystery Market ${result.day}: ${pct(result.ret)}${better}${result.guessed ? ", and I named the decade" : ""}. Can you beat it? https://market-city-game.vercel.app/daily`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const body = (
    <>
      <p className="text-center text-sm font-semibold text-sub">Mystery Market, {result.day}</p>
      <p className={`num mt-1 text-center text-6xl font-extrabold ${result.ret >= 0 ? "text-up" : "text-down"}`}>{pct(result.ret)}</p>
      <p className="mt-2 text-center text-sub">
        {result.marketRet !== null && <>The market did {pct(result.marketRet)}. </>}
        It was <strong className="text-text">{monthLabel(result.reveal.from)} to {monthLabel(result.reveal.to)}</strong>
        {result.reveal.during ? <>, during {result.reveal.during}</> : null}.{" "}
        {result.guessed ? `You named the decade.` : `It was ${result.reveal.eraName.replace("The ", "the ")}, so your guess was off.`}
      </p>
      {result.alreadyPlayed && <p className="mt-1 text-center text-xs text-dim">You&apos;d already played today, so your first score ({pct(result.ret)}) is the one that counts.</p>}

      <StandingView standing={stand} audience="today's players" />

      {badges.length > 0 && (
        <p className="mt-4 rounded-xl border border-own/40 bg-own/10 p-3 text-sm">
          <strong className="text-own">New badge:</strong> {badges.map((b) => b.name).join(", ")}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={share} className="rounded-xl bg-glow px-5 py-2.5 text-sm font-extrabold text-night hover:brightness-110">
          {copied ? "Copied to clipboard" : "Copy my result"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
            See the final city
          </button>
        )}
        {onReplay && (
          <button type="button" onClick={onReplay} className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
            Play again for fun
          </button>
        )}
        <Link href="/" className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
          Back to the eras
        </Link>
      </div>
      {practice && <p className="mt-3 text-center text-[11px] text-dim">This was a practice run. Only your first score counts today.</p>}

      <Countdown />

    </>
  );

  if (onClose) return <Modal onClose={onClose}>{body}</Modal>;
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <div className="panel p-6 sm:p-8">{body}</div>
    </main>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.code === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-night/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="panel slide-in relative my-8 w-full max-w-2xl bg-panel-solid p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 rounded-lg px-2 py-1 text-sub hover:bg-white/5 hover:text-text" aria-label="Close">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
