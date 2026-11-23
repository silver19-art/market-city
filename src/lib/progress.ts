/** Per-browser progress: best result in each era, daily results and badges. Stored in localStorage. */
import { ERAS } from "./eras";

export interface Progress {
  eras: Record<string, { best: number; beat: boolean; plays: number }>;
  daily: Record<string, { ret: number; beat: boolean }>;
  flags: string[];
}

const KEY = "market-city-progress";
const empty = (): Progress => ({ eras: {}, daily: {}, flags: [] });

export function loadProgress(): Progress {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return raw ? { ...empty(), ...(JSON.parse(raw) as Progress) } : empty();
  } catch {
    return empty();
  }
}

function save(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("market-city-progress"));
  } catch {
    /* private mode: progress just isn't kept */
  }
}

export interface Badge {
  id: string;
  name: string;
  how: string;
  earned: (p: Progress) => boolean;
}

const beat = (p: Progress, id: string) => !!p.eras[id]?.beat;

export const BADGES: Badge[] = [
  { id: "opening-bell", name: "Opening bell", how: "Finish your first round", earned: (p) => Object.keys(p.eras).length > 0 },
  { id: "crash-survivor", name: "Crash survivor", how: "Beat the market in the Great Crash", earned: (p) => beat(p, "crash1929") },
  { id: "bubble-dodger", name: "Bubble dodger", how: "Beat the market in the dot-com bubble", earned: (p) => beat(p, "dotcom") },
  { id: "short-seller", name: "Short seller", how: "Make money on a short", earned: (p) => p.flags.includes("short-win") },
  { id: "time-traveler", name: "Time traveler", how: `Finish all ${ERAS.length} eras`, earned: (p) => ERAS.every((e) => p.eras[e.id]) },
  { id: "market-master", name: "Market master", how: `Beat the market in all ${ERAS.length} eras`, earned: (p) => ERAS.every((e) => beat(p, e.id)) },
  { id: "mystery-winner", name: "Mystery winner", how: "Beat the market in a Mystery Market", earned: (p) => Object.values(p.daily).some((d) => d.beat) },
  { id: "regular", name: "Regular", how: "Play the Mystery Market on 3 different days", earned: (p) => Object.keys(p.daily).length >= 3 },
];

export const earnedBadges = (p: Progress) => BADGES.filter((b) => b.earned(p));

/** Record a finished era round and return any badges it unlocked. */
export function recordRound(eraId: string, ret: number, beatMarket: boolean, shortWin: boolean): Badge[] {
  const before = new Set(earnedBadges(loadProgress()).map((b) => b.id));
  const p = loadProgress();
  const prev = p.eras[eraId];
  p.eras[eraId] = { best: prev ? Math.max(prev.best, ret) : ret, beat: !!prev?.beat || beatMarket, plays: (prev?.plays ?? 0) + 1 };
  if (shortWin && !p.flags.includes("short-win")) p.flags.push("short-win");
  save(p);
  return earnedBadges(p).filter((b) => !before.has(b.id));
}

export function recordDaily(day: string, ret: number, beat: boolean): Badge[] {
  const before = new Set(earnedBadges(loadProgress()).map((b) => b.id));
  const p = loadProgress();
  // Older saves didn't record "beat", so fill it in when the same day is shown again.
  if (!p.daily[day] || p.daily[day].beat === undefined) p.daily[day] = { ret: p.daily[day]?.ret ?? ret, beat };
  save(p);
  return earnedBadges(p).filter((b) => !before.has(b.id));
}
