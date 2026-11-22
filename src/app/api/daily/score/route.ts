import { isValidDay, replayScore, todayKey, type SubmittedTrade } from "@/lib/daily";
import { puzzleFor } from "@/lib/daily-server";
import { cleanName, leaderboard, saveScore } from "@/lib/leaderboard";

/**
 * Finish a Mystery Market: the server re-runs the trades on the real prices, saves the score,
 * and only then reveals which era and companies it was.
 */
export async function POST(request: Request) {
  let body: { day?: string; name?: string; clientId?: string; trades?: SubmittedTrade[]; guess?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 24 * 3600 * 1000));
  const day = String(body.day ?? "");
  // Today's market, plus a grace period for anyone who started just before midnight.
  if (!isValidDay(day) || (day !== today && day !== yesterday)) return Response.json({ error: "That day's market is closed." }, { status: 400 });
  const clientId = String(body.clientId ?? "").slice(0, 64);
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(clientId)) return Response.json({ error: "Bad request" }, { status: 400 });
  const name = cleanName(body.name);
  if (!name) return Response.json({ error: "Pick a different nickname (letters and numbers, up to 20 characters)." }, { status: 400 });

  let built;
  try {
    built = await puzzleFor(day);
  } catch {
    return Response.json({ error: "Couldn’t check your score right now. Try again in a minute." }, { status: 503 });
  }
  const result = replayScore(Array.isArray(body.trades) ? body.trades : [], built.puzzle.prices);
  if (!result.ok) return Response.json({ error: `Those trades don't add up (${result.reason}).` }, { status: 400 });

  const guessed = body.guess === built.reveal.eraId;
  const ret = Math.round(result.ret * 10000) / 10000;
  const saved = await saveScore(day, clientId, { name, ret, guessed }).catch(() => ({ saved: false, existing: false }));
  const board = await leaderboard(day, clientId).catch(() => ({ enabled: false, entries: [], total: 0, you: null }));
  const spy = built.puzzle.spy;
  const first = spy.find((v) => v != null) ?? 0;
  const last = spy[spy.length - 1] ?? first;
  return Response.json({
    day,
    ret,
    value: result.value,
    marketRet: first ? last / first - 1 : null,
    guessed,
    reveal: built.reveal,
    saved: saved.saved,
    alreadyPlayed: saved.existing,
    leaderboard: board,
  });
}
