import { eraById } from "@/lib/eras";
import { loadEra } from "@/lib/load-era";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("era") ?? "";
  if (!eraById(id)) return Response.json({ error: "Unknown era" }, { status: 404 });
  try {
    const data = await loadEra(id);
    return Response.json(data, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (e) {
    console.error("history", id, e);
    return Response.json({ error: "Couldn’t load prices right now. Try again in a minute." }, { status: 503 });
  }
}
