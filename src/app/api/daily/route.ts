import { isValidDay, todayKey } from "@/lib/daily";
import { puzzleFor } from "@/lib/daily-server";

/** Today's Mystery Market, with names, dates and news stripped out. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("day");
  const today = todayKey();
  const day = asked && isValidDay(asked) && asked <= today ? asked : today;
  try {
    const { puzzle } = await puzzleFor(day);
    return Response.json(puzzle, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } });
  } catch (e) {
    console.error("daily", day, e);
    return Response.json({ error: "Couldn’t load today’s market. Try again in a minute." }, { status: 503 });
  }
}
