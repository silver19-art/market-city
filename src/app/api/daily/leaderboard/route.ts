import { isValidDay, todayKey } from "@/lib/daily";
import { leaderboard } from "@/lib/leaderboard";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const asked = url.searchParams.get("day");
  const day = asked && isValidDay(asked) ? asked : todayKey();
  const clientId = url.searchParams.get("me") ?? undefined;
  try {
    return Response.json({ day, ...(await leaderboard(day, clientId)) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("leaderboard", e);
    return Response.json({ day, enabled: false, entries: [], total: 0, you: null });
  }
}
