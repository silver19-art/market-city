import { BENCHMARK, eraById, monthsBetween } from "@/lib/eras";
import { compact, parseStooqCsv, parseYahooChart, type Series } from "@/lib/history";
import { cacheLife } from "next/cache";

const UA = "Mozilla/5.0 (compatible; MarketCity/1.0)";

async function fromYahoo(ticker: string, months: string[]): Promise<Series | null> {
  const [y1, m1] = months[0].split("-").map(Number);
  const [y2, m2] = months[months.length - 1].split("-").map(Number);
  const p1 = Date.UTC(y1, m1 - 1, 1) / 1000 - 86400 * 3;
  const p2 = Date.UTC(y2, m2, 1) / 1000 + 86400 * 3;
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(
        `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=1mo&events=div%2Csplit&includeAdjustedClose=true`,
        { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" },
      );
      if (!res.ok) continue;
      const s = parseYahooChart(await res.json(), months);
      if (s) return s;
    } catch {
      /* try the next host */
    }
  }
  return null;
}

async function fromStooq(ticker: string, months: string[]): Promise<Series | null> {
  try {
    const sym = `${ticker.toLowerCase().replace(".", "-")}.us`;
    const res = await fetch(`https://stooq.com/q/d/l/?s=${sym}&i=m`, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseStooqCsv(await res.text(), months);
  } catch {
    return null;
  }
}

async function series(ticker: string, months: string[]) {
  return (await fromYahoo(ticker, months)) ?? (await fromStooq(ticker, months));
}

/** Monthly prices for every company in an era plus the S&P 500 (SPY). History never changes, so cache for a long time. */
async function loadEra(id: string) {
  "use cache";
  cacheLife("max");
  const era = eraById(id);
  if (!era) throw new Error("unknown era");
  const months = monthsBetween(era.start, era.end);
  const tickers = [...era.companies.map((c) => c.ticker), BENCHMARK];

  const results: Record<string, Series | null> = {};
  // A few at a time, to be polite to the free sources.
  for (let i = 0; i < tickers.length; i += 6) {
    const batch = tickers.slice(i, i + 6);
    const got = await Promise.all(batch.map((t) => series(t, months)));
    batch.forEach((t, j) => (results[t] = got[j]));
  }

  const missing = tickers.filter((t) => !results[t]);
  // Don't cache a mostly failed load: throwing skips the cache so the next request retries.
  if (!results[BENCHMARK] || missing.length > tickers.length / 3) throw new Error(`price sources unavailable (${missing.length} missing)`);

  const prices: Record<string, Series> = {};
  for (const c of era.companies) if (results[c.ticker]) prices[c.ticker] = compact(results[c.ticker]!);
  return { era: era.id, months, prices, spy: compact(results[BENCHMARK]!), missing };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("era") ?? "";
  if (!eraById(id)) return Response.json({ error: "Unknown era" }, { status: 404 });
  try {
    const data = await loadEra(id);
    return Response.json(data, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ error: "Couldn’t load prices right now. Try again in a minute." }, { status: 503 });
  }
}
