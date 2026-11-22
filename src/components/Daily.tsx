"use client";

import type { Puzzle, Reveal } from "@/lib/daily";
import { STARTING_CASH, portfolioValue } from "@/lib/engine";
import type { Era } from "@/lib/eras";
import { monthLabel, pct } from "@/lib/format";
import { recordDaily, type Badge } from "@/lib/progress";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Board, type EndProps } from "./Game";

interface Entry {
  rank: number;
  name: string;
  ret: number;
  guessed: boolean;
  you?: boolean;
}
interface Board_ {
  enabled: boolean;
  entries: Entry[];
  total: number;
  you: Entry | null;
}
interface Result {
  day: string;
  ret: number;
  marketRet: number | null;
  guessed: boolean;
  guess: string | null;
  reveal: Reveal;
  saved: boolean;
  alreadyPlayed: boolean;
  leaderboard: Board_;
}

const RESULT_KEY = (day: string) => `market-city-daily-${day}`;
const NAME_KEY = "market-city-nickname";

function clientId() {
  try {
    let id = window.localStorage.getItem("market-city-client");
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem("market-city-client", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readResult(day: string): Result | null {
  try {
    const raw = window.localStorage.getItem(RESULT_KEY(day));
    return raw ? (JSON.parse(raw) as Result) : null;
  } catch {
    return null;
  }
}

/** The daily Mystery Market: load today's hidden stretch, play it, then submit for the reveal and leaderboard. */
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
        pitch: "A real stretch of market history, with the dates, names and news hidden. Every stock starts at $100.",
        lesson: "",
        companies: puzzle.companies,
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
  const ret = portfolioValue(game, puzzle.prices) / STARTING_CASH - 1;
  const first = puzzle.spy.find((v) => v != null) ?? null;
  const last = puzzle.spy[puzzle.spy.length - 1];
  const marketRet = first && last ? last / first - 1 : null;
  const [guess, setGuess] = useState<string | null>(null);
  const [name, setName] = useState(() => {
    try {
      return window.localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      window.localStorage.setItem(NAME_KEY, name);
    } catch {
      /* fine */
    }
    try {
      const res = await fetch("/api/daily/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day: puzzle.day,
          name,
          clientId: clientId(),
          guess,
          trades: game.trades.filter((t) => !t.forced).map((t) => ({ month: t.month, ticker: t.ticker, side: t.side, shares: t.shares })),
        }),
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
      {marketRet !== null && <p className="mt-1 text-sub">The market did {pct(marketRet)} over the same 24 months.</p>}

      <h3 className="mt-6 text-sm font-bold text-glow">Which era do you think this was?</h3>
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

      <label className="mt-6 block text-sm font-bold text-glow" htmlFor="nick">
        Nickname for the leaderboard
      </label>
      <input
        id="nick"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        placeholder="e.g. RedHawkTrader"
        className="mt-2 h-11 w-full rounded-xl border border-edge bg-white/5 px-3 text-sm placeholder:text-dim focus:border-glow focus:outline-none"
      />
      {err && <p className="mt-2 text-sm text-down">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={!guess || !name.trim() || busy} onClick={submit} className="rounded-xl bg-glow px-5 py-2.5 text-sm font-extrabold text-night hover:brightness-110 disabled:opacity-40">
          {busy ? "Checking your trades…" : "Submit and reveal the era"}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
          Look at the city first
        </button>
      </div>
      <p className="mt-4 text-[11px] text-dim">One score per day. The server replays your trades on the real prices to check your score.</p>
    </Modal>
  );
}

function Results({ result, onClose, onReplay, practice = false }: { result: Result; onClose?: () => void; onReplay?: () => void; practice?: boolean }) {
  const [board, setBoard] = useState<Board_>(result.leaderboard);
  const [copied, setCopied] = useState(false);
  const [badges] = useState<Badge[]>(() => recordDaily(result.day, result.ret, result.guessed));

  useEffect(() => {
    // Refresh so the board shows everyone who has played since.
    fetch(`/api/daily/leaderboard?day=${result.day}&me=${encodeURIComponent(clientId())}`)
      .then((r) => r.json())
      .then((d: Board_) => d.enabled && setBoard(d))
      .catch(() => {});
  }, [result.day]);

  const you = board.you;
  const share = async () => {
    const text = `Market City Mystery Market ${result.day}: ${pct(result.ret)}${you ? ` (#${you.rank} of ${board.total})` : ""}${result.guessed ? ", named the era" : ""}. Can you beat it? https://market-city-game.vercel.app/daily`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const body = (
    <>
      <p className="text-sm font-semibold text-sub">Mystery Market, {result.day}</p>
      <h2 className="mt-1 text-3xl font-extrabold">
        It was {result.reveal.eraName}: {monthLabel(result.reveal.from)} to {monthLabel(result.reveal.to)}
      </h2>
      <p className="mt-2 text-sub">
        You finished at <strong className={result.ret >= 0 ? "text-up" : "text-down"}>{pct(result.ret)}</strong>
        {result.marketRet !== null && <> against the market&apos;s {pct(result.marketRet)}</>}.{" "}
        {result.guessed ? "And you named the era." : "Your era guess was off this time."}
        {result.alreadyPlayed && " You'd already played today, so your first score stands."}
      </p>

      {badges.length > 0 && (
        <p className="mt-4 rounded-xl border border-own/40 bg-own/10 p-3 text-sm">
          <strong className="text-own">New badge:</strong> {badges.map((b) => b.name).join(", ")}
        </p>
      )}

      <h3 className="mt-6 text-sm font-bold text-glow">Today&apos;s leaderboard</h3>
      {board.enabled ? (
        <>
          <ol className="mt-2 divide-y divide-edge overflow-hidden rounded-xl border border-edge">
            {board.entries.map((e) => (
              <li key={`${e.rank}-${e.name}`} className={`flex items-center gap-3 px-3 py-2 text-sm ${e.you ? "bg-glow/15" : ""}`}>
                <span className="num w-7 text-dim">{e.rank}</span>
                <span className="flex-1 truncate font-semibold">
                  {e.name}
                  {e.you && <span className="ml-1 text-xs text-glow">you</span>}
                </span>
                {e.guessed && <span className="text-xs text-sub">named the era</span>}
                <span className={`num w-20 text-right font-bold ${e.ret >= 0 ? "text-up" : "text-down"}`}>{pct(e.ret)}</span>
              </li>
            ))}
          </ol>
          {you && you.rank > board.entries.length && (
            <p className="mt-2 text-sm text-sub">
              You&apos;re #{you.rank} of {board.total}.
            </p>
          )}
          <p className="mt-2 text-[11px] text-dim">Resets at midnight New York time. {board.total} played today.</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-sub">The leaderboard isn&apos;t switched on yet, but your score is saved on this device.</p>
      )}

      <details className="mt-5 text-sm">
        <summary className="cursor-pointer font-bold text-glow">Which stock was which</summary>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sub">
          {result.reveal.key.map((k) => (
            <li key={k.label}>
              <span className="font-bold text-text">Stock {k.label}</span> = {k.name}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-6 flex flex-wrap gap-3">
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
      {practice && <p className="mt-3 text-[11px] text-dim">This was a practice run. Only your first score counts today.</p>}
      <p className="mt-2 text-[11px] text-dim">A new Mystery Market opens at midnight New York time.</p>
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
