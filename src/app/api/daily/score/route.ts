import { isValidDay, replayScore, todayKey, type SubmittedTrade } from "@/lib/daily";
import { puzzleFor } from "@/lib/daily-server";
import { DAILY_TTL, dailyKey, saveScore, standing, validClient } from "@/lib/scores";

/**
 * Finish a Mystery Market: the server re-runs the trades on the real prices, saves the first score
 * of the day for this browser, and only then reveals the time period and how you compare with everyone else.
 */
export async function POST(request: Request) {
  let body: { day?: string; clientId?: string; trades?: SubmittedTrade[] };
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
  if (!validClient(body.clientId)) return Response.json({ error: "Bad request" }, { status: 400 });
  const clientId = body.clientId as string;

  let built;
  try {
    built = await puzzleFor(day);
  } catch {
    return Response.json({ error: "Couldn’t check your score right now. Try again in a minute." }, { status: 503 });
  }
  const result = replayScore(Array.isArray(body.trades) ? body.trades : [], built.puzzle.prices);
  if (!result.ok) return Response.json({ error: `Those trades don't add up (${result.reason}).` }, { status: 400 });

  const ret = Math.round(result.ret * 10000) / 10000;
  let counted = ret;
  let stand = null;
  try {
    counted = (await saveScore(dailyKey(day), clientId, ret, "first", DAILY_TTL)) ?? ret;
    stand = await standing(dailyKey(day), clientId, counted);
  } catch (e) {
    console.error("daily score storage", e);
  }
  const spy = built.puzzle.spy;
  const first = spy.find((v) => v != null) ?? 0;
  const last = spy[spy.length - 1] ?? first;
  return Response.json({
    day,
    ret: counted,
    thisRound: ret,
    alreadyPlayed: Math.abs(counted - ret) > 1e-9,
    marketRet: first ? last / first - 1 : null,
    reveal: built.reveal,
    standing: stand,
  });
}
