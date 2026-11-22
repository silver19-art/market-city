import { BENCHMARK, eraById, monthsBetween } from "@/lib/eras";
import { FACTORS_FILE, FRENCH_BASE, INDUSTRIES_FILE, marketReturns, parseFrenchMonthly, toIndex } from "@/lib/french";
import { compact, parseStooqCsv, parseYahooChart, type Series } from "@/lib/history";
import { unzipSync, strFromU8 } from "fflate";
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

/** Download one zipped CSV from the French data library and parse its monthly table. */
async function french(file: string) {
  const res = await fetch(FRENCH_BASE + file, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!res.ok) throw new Error(`French data ${res.status}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const csv = Object.values(files)[0];
  if (!csv) throw new Error("empty archive");
  return parseFrenchMonthly(strFromU8(csv));
}

/** Monthly prices for every company in an era plus its benchmark. History never changes, so cache for a long time. */
async function loadEra(id: string) {
  "use cache";
  cacheLife("max");
  return fetchEra(id);
}

async function fetchEra(id: string) {
  const era = eraById(id);
  if (!era) throw new Error("unknown era");
  const months = monthsBetween(era.start, era.end);

  const market = era.benchmark === "MARKET" ? toIndex(marketReturns(await french(FACTORS_FILE)), months) : null;
  if (era.benchmark === "MARKET" && !market) throw new Error("market data unavailable");

  if (era.source === "industries") {
    const table = await french(INDUSTRIES_FILE);
    const prices: Record<string, Series> = {};
    const missing: string[] = [];
    for (const c of era.companies) {
      const s = table[c.ticker] ? toIndex(table[c.ticker], months) : null;
      if (s) prices[c.ticker] = compact(s);
      else missing.push(c.ticker);
    }
    if (missing.length > era.companies.length / 3) throw new Error("industry data unavailable");
    return { era: era.id, months, prices, spy: compact(market!), missing };
  }

  const tickers = [...era.companies.map((c) => c.ticker), ...(market ? [] : [BENCHMARK])];

  const results: Record<string, Series | null> = {};
  // A few at a time, to be polite to the free sources.
  for (let i = 0; i < tickers.length; i += 6) {
    const batch = tickers.slice(i, i + 6);
    const got = await Promise.all(batch.map((t) => series(t, months)));
    batch.forEach((t, j) => (results[t] = got[j]));
  }

  const missing = tickers.filter((t) => !results[t]);
  // Don't cache a mostly failed load: throwing skips the cache so the next request retries.
  const bench = market ?? results[BENCHMARK];
  if (!bench || missing.length > tickers.length / 3) throw new Error(`price sources unavailable (missing ${missing.join(", ")})`);

  const prices: Record<string, Series> = {};
  for (const c of era.companies) if (results[c.ticker]) prices[c.ticker] = compact(results[c.ticker]!);
  return { era: era.id, months, prices, spy: compact(bench), missing };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("era") ?? "";
  if (!eraById(id)) return Response.json({ error: "Unknown era" }, { status: 404 });
  try {
    // ?fresh=1 skips the cache, which also lets a failure explain itself.
    const data = url.searchParams.has("fresh") ? await fetchEra(id) : await loadEra(id);
    return Response.json(data, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (e) {
    return Response.json({ error: "Couldn’t load prices right now. Try again in a minute.", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
