"use client";

import { clientId } from "@/lib/client-id";
import { DAILY_MS_PER_MONTH, puzzleNumber, replayScore, shareGrid, type Puzzle, type Reveal } from "@/lib/daily";
import type { Era } from "@/lib/eras";
import { monthLabel, pct } from "@/lib/format";
import { learnForWindow } from "@/lib/learn";
import { recordDaily, type Badge } from "@/lib/progress";
import type { Standing } from "@/lib/standings";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DailyMobile } from "./DailyMobile";
import { Board, type EndProps } from "./Game";
import { LearnLinks } from "./LearnLinks";
import { Countdown, StandingView } from "./StandingView";

interface Result {
  day: string;
  /** The score that counts today (your first finish). */
  ret: number;
  thisRound: number;
  alreadyPlayed: boolean;
  marketRet: number | null;
  reveal: Reveal;
  standing: Standing | null;
  /** Wordle-style squares, one per month: did you beat the market? */
  grid?: string;
}

const PHONE_QUERY = "(max-width: 767px), (pointer: coarse) and (max-width: 1100px)";
/** Phones and small touch screens get the 2D tile layout; laptops keep the 3D city. */
function useIsPhone() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

const RESULT_KEY = (day: string) => `market-city-daily-v3-${day}`;

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
  const phone = useIsPhone();

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
            ? "A real two-year stretch of US market history from before 1985, so the towers are whole industries. The dates and news stay hidden until the end, and everything starts at $100."
            : "A real two-year stretch of US market history since 1985. You know the companies, but the dates and news stay hidden until the end, and every stock starts at $100.",
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

  const renderEnd = (p: EndProps) =>
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
    );

  if (phone) return <DailyMobile puzzle={puzzle} renderEnd={renderEnd} />;
  return <Board era={era} data={{ months: puzzle.months, prices: puzzle.prices, spy: puzzle.spy, missing: [] }} renderEnd={renderEnd} timed={DAILY_MS_PER_MONTH} />;
}

function Finish({ game, onClose, puzzle, onResult }: EndProps & { puzzle: Puzzle; onResult: (r: Result) => void }) {
  const trades = game.trades.filter((t) => !t.forced).map((t) => ({ month: t.month, ticker: t.ticker, side: t.side, shares: t.shares }));
  // Score exactly the way the server will: positions are held to the final month.
  const scored = replayScore(trades, puzzle.prices);
  const ret = scored.ok ? scored.ret : 0;
  const endedEarly = game.month < puzzle.months.length - 1;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/daily/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day: puzzle.day, clientId: clientId(), trades }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Couldn’t submit. Try again.");
      const r: Result = { ...d, grid: scored.ok ? shareGrid(scored.values, puzzle.spy) : undefined };
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
      {scored.ok && <p className="mt-3 text-2xl leading-tight whitespace-pre">{shareGrid(scored.values, puzzle.spy)}</p>}
      <p className="mt-1 text-xs text-dim">One square per month: green when you beat the market, red when you trailed it.</p>

      {err && <p className="mt-3 text-sm text-down">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-glow px-5 py-2.5 text-sm font-extrabold text-night hover:brightness-110 disabled:opacity-40">
          {busy ? "Checking your trades…" : "Reveal the time period"}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border border-edge-strong px-5 py-2.5 text-sm font-bold hover:bg-white/5">
          Look around first
        </button>
      </div>
      <p className="mt-4 text-[11px] text-dim">One score per day. The server replays your trades on the real prices to check it.</p>
    </Modal>
  );
}

function Results({ result, onClose, onReplay, practice = false }: { result: Result; onClose?: () => void; onReplay?: () => void; practice?: boolean }) {
  const [stand, setStand] = useState<Standing | null>(result.standing);
  const [copied, setCopied] = useState(false);
  const [badges] = useState<Badge[]>(() => recordDaily(result.day, result.ret, result.marketRet !== null && result.ret > result.marketRet));

  useEffect(() => {
    // The distribution keeps growing as more people finish, so refresh it.
    fetch(`/api/daily/stats?day=${result.day}&me=${encodeURIComponent(clientId())}`)
      .then((r) => r.json())
      .then((d: { standing: Standing | null }) => d.standing && setStand(d.standing))
      .catch(() => {});
  }, [result.day]);

  const share = async () => {
    const better = stand?.percentile != null ? `Beat ${Math.round(stand.percentile * 100)}% of ${stand.basis === "simulated" ? "simulated investors" : "players"}` : "";
    const text = [`Market City Mystery Market #${puzzleNumber(result.day)}`, `${pct(result.ret)}${better ? `. ${better}` : ""}`, result.grid ?? "", "https://market-city-game.vercel.app/daily"].filter(Boolean).join("\n");
    try {
      // Phones get the native share sheet (Messages, Instagram, etc.); laptops copy to the clipboard.
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const body = (
    <>
      <p className="text-center text-sm font-semibold text-sub">
        Mystery Market #{puzzleNumber(result.day)}, {result.day}
      </p>
      <p className={`num mt-1 text-center text-6xl font-extrabold ${result.ret >= 0 ? "text-up" : "text-down"}`}>{pct(result.ret)}</p>
      {result.grid && <p className="mt-3 text-center text-2xl leading-tight whitespace-pre">{result.grid}</p>}
      <p className="mt-3 text-center text-sm font-semibold text-sub">The time period was</p>
      <p className="sign text-center text-3xl font-extrabold">
        {monthLabel(result.reveal.from, true)} to {monthLabel(result.reveal.to, true)}
      </p>
      <p className="mt-1 text-center text-sub">
        {result.reveal.during && <>That&apos;s during {result.reveal.during.name}. </>}
        {result.marketRet !== null && <>The whole market did {pct(result.marketRet)}.</>}
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
          {copied ? "Copied to clipboard" : "Share my result"}
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

      <LearnLinks links={learnForWindow(result.reveal.from, result.reveal.to, result.reveal.during?.id ?? null)} heading="Learn what happened in these years" />

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
