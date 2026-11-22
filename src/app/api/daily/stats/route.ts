import { isValidDay, todayKey } from "@/lib/daily";
import { dailyKey, standing, storedScore, validClient } from "@/lib/scores";

/** Fresh percentile for a player who already finished today (the distribution keeps growing). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const asked = url.searchParams.get("day");
  const day = asked && isValidDay(asked) ? asked : todayKey();
  const me = url.searchParams.get("me");
  if (!validClient(me)) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    const mine = await storedScore(dailyKey(day), me!);
    if (mine == null) return Response.json({ standing: null }, { headers: { "cache-control": "no-store" } });
    return Response.json({ standing: await standing(dailyKey(day), me!, mine) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("daily stats", e);
    return Response.json({ standing: null });
  }
}
