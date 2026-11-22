import { replayScore, type SubmittedTrade } from "@/lib/daily";
import { eraById } from "@/lib/eras";
import { loadEra } from "@/lib/load-era";
import { eraKey, saveScore, standing, validClient } from "@/lib/scores";
import { simulateReturns } from "@/lib/simulate";
import { cacheLife } from "next/cache";

/** Simulated investors for an era, computed once and cached (the prices never change). */
async function simulatedForEra(id: string) {
  "use cache";
  cacheLife("max");
  const data = await loadEra(id);
  let seed = 7;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return simulateReturns(data.prices, data.months.length, seed);
}

/**
 * Compare a finished era round with everyone who has played that era. The server replays the trades
 * on the real prices, keeps each browser's best score, and returns where this round ranks.
 */
export async function POST(request: Request) {
  let body: { era?: string; clientId?: string; trades?: SubmittedTrade[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const era = eraById(String(body.era ?? ""));
  if (!era || !validClient(body.clientId)) return Response.json({ error: "Bad request" }, { status: 400 });
  let data;
  try {
    data = await loadEra(era.id);
  } catch {
    return Response.json({ error: "Couldn’t check your round right now." }, { status: 503 });
  }
  const result = replayScore(Array.isArray(body.trades) ? body.trades : [], data.prices, data.months.length);
  if (!result.ok) return Response.json({ error: `Those trades don't add up (${result.reason}).` }, { status: 400 });
  const ret = Math.round(result.ret * 10000) / 10000;
  try {
    await saveScore(eraKey(era.id), body.clientId as string, ret, "best");
    return Response.json({ ret, standing: await standing(eraKey(era.id), body.clientId as string, ret, await simulatedForEra(era.id)) });
  } catch (e) {
    console.error("era score storage", e);
    return Response.json({ ret, standing: null });
  }
}
