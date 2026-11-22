/**
 * Playable eras. Each company must still be trading today (that's the only way free data
 * exists for it), which is itself a lesson: survivorship bias. Events are real, dated to the month.
 */

export type Sector = "Tech" | "Finance" | "Energy" | "Consumer" | "Health" | "Industrial" | "Travel";

export interface Company {
  ticker: string;
  name: string;
  sector: Sector;
}

export interface NewsEvent {
  month: string; // YYYY-MM
  headline: string;
}

export interface Era {
  id: string;
  name: string;
  years: string;
  start: string; // first month, YYYY-MM
  end: string; // last month, YYYY-MM
  pitch: string;
  lesson: string;
  companies: Company[];
  events: NewsEvent[];
  /** "industries": each building is a Fama-French industry portfolio (for years before stock-by-stock data exists). */
  source?: "stocks" | "industries";
  /** What you're trying to beat. SPY only exists from 1993; earlier eras use the whole US market with dividends. */
  benchmark?: "SPY" | "MARKET";
}

export const BENCHMARK = "SPY";

export const benchmarkName = (era: Era) => (era.benchmark === "MARKET" ? "Stock market" : "S&P 500");
export const benchmarkLong = (era: Era) => (era.benchmark === "MARKET" ? "Whole US stock market, dividends included" : "S&P 500 (SPY), buy and hold");
export const unitName = (era: Era) => (era.source === "industries" ? "industry" : "company");

export const ERAS: Era[] = [
  {
    id: "crash1929",
    name: "The Great Crash",
    years: "1928–1933",
    start: "1928-01",
    end: "1933-12",
    pitch: "Everyone is buying stocks with borrowed money. What could go wrong?",
    lesson:
      "From its 1929 peak the Dow fell 89% by July 1932, and it didn't get back to its 1929 high until 1954. Buying on margin turned a crash into total wipeouts, and the banks that failed took savers down with them.",
    source: "industries",
    benchmark: "MARKET",
    companies: [
      { ticker: "Autos", name: "Automakers", sector: "Industrial" },
      { ticker: "Steel", name: "Steel", sector: "Industrial" },
      { ticker: "Carry", name: "Aircraft, ships and rail cars", sector: "Industrial" },
      { ticker: "ElcEq", name: "Electrical equipment", sector: "Industrial" },
      { ticker: "Chems", name: "Chemicals", sector: "Industrial" },
      { ticker: "Oil", name: "Oil", sector: "Energy" },
      { ticker: "Util", name: "Utilities", sector: "Energy" },
      { ticker: "Mines", name: "Mining", sector: "Energy" },
      { ticker: "Telcm", name: "Telephone and radio", sector: "Tech" },
      { ticker: "BusEq", name: "Business machines", sector: "Tech" },
      { ticker: "Fin", name: "Banks and finance", sector: "Finance" },
      { ticker: "Trans", name: "Railroads and transport", sector: "Travel" },
      { ticker: "Rtail", name: "Retail stores", sector: "Consumer" },
      { ticker: "Food", name: "Food", sector: "Consumer" },
      { ticker: "Smoke", name: "Tobacco", sector: "Consumer" },
      { ticker: "Beer", name: "Beer and liquor", sector: "Consumer" },
    ],
    events: [
      { month: "1928-11", headline: "Herbert Hoover wins the presidency and stocks surge" },
      { month: "1929-03", headline: "Borrowing costs for stock buyers spike near 20% and the market wobbles" },
      { month: "1929-09", headline: "The Dow peaks at 381 on September 3" },
      { month: "1929-10", headline: "Black Thursday and Black Tuesday: the stock market crashes" },
      { month: "1930-06", headline: "The Smoot-Hawley Tariff raises taxes on imports and trade shrinks" },
      { month: "1930-12", headline: "The Bank of United States fails, the largest bank failure yet" },
      { month: "1931-09", headline: "Britain abandons the gold standard" },
      { month: "1932-07", headline: "The Dow hits bottom at 41, down 89% from its peak" },
      { month: "1932-11", headline: "Franklin Roosevelt wins the presidency in a landslide" },
      { month: "1933-03", headline: "FDR closes every bank for a national bank holiday and starts the New Deal" },
      { month: "1933-04", headline: "The US leaves the gold standard and stocks soar" },
      { month: "1933-12", headline: "Prohibition ends: beer and liquor are legal again" },
    ],
  },
  {
    id: "ww2",
    name: "World War II",
    years: "1939–1945",
    start: "1939-01",
    end: "1945-12",
    pitch: "The world goes to war. Do you sell, or bet on the recovery?",
    lesson:
      "Stocks hit their low in April 1942, when the war news was at its worst and victory was years away. Markets look ahead: by the end of the war, the market had more than doubled from that low.",
    source: "industries",
    benchmark: "MARKET",
    companies: [
      { ticker: "Carry", name: "Aircraft, ships and rail cars", sector: "Industrial" },
      { ticker: "Steel", name: "Steel", sector: "Industrial" },
      { ticker: "Autos", name: "Automakers", sector: "Industrial" },
      { ticker: "ElcEq", name: "Electrical equipment", sector: "Industrial" },
      { ticker: "Chems", name: "Chemicals", sector: "Industrial" },
      { ticker: "Oil", name: "Oil", sector: "Energy" },
      { ticker: "Util", name: "Utilities", sector: "Energy" },
      { ticker: "Mines", name: "Mining", sector: "Energy" },
      { ticker: "Telcm", name: "Telephone and radio", sector: "Tech" },
      { ticker: "BusEq", name: "Business machines", sector: "Tech" },
      { ticker: "Fin", name: "Banks and finance", sector: "Finance" },
      { ticker: "Trans", name: "Railroads and transport", sector: "Travel" },
      { ticker: "Rtail", name: "Retail stores", sector: "Consumer" },
      { ticker: "Food", name: "Food", sector: "Consumer" },
      { ticker: "Smoke", name: "Tobacco", sector: "Consumer" },
      { ticker: "Beer", name: "Beer and liquor", sector: "Consumer" },
    ],
    events: [
      { month: "1939-09", headline: "Germany invades Poland. Britain and France declare war" },
      { month: "1940-05", headline: "Germany invades France and the Low Countries, and US stocks plunge" },
      { month: "1940-06", headline: "France falls to Germany" },
      { month: "1941-03", headline: "Lend-Lease: the US starts supplying Britain with weapons" },
      { month: "1941-12", headline: "Japan attacks Pearl Harbor and the US enters the war" },
      { month: "1942-04", headline: "Stocks hit their wartime low" },
      { month: "1942-06", headline: "The US Navy wins the Battle of Midway" },
      { month: "1943-02", headline: "Germany's army surrenders at Stalingrad" },
      { month: "1943-09", headline: "Italy surrenders to the Allies" },
      { month: "1944-06", headline: "D-Day: Allied troops land in Normandy" },
      { month: "1945-04", headline: "President Roosevelt dies" },
      { month: "1945-05", headline: "Germany surrenders" },
      { month: "1945-08", headline: "Atomic bombs fall on Japan, and Japan surrenders" },
    ],
  },
  {
    id: "stagflation",
    name: "Stagflation",
    years: "1973–1982",
    start: "1973-01",
    end: "1982-12",
    pitch: "Prices are rising everywhere. Stocks? Not so much.",
    lesson:
      "In August 1982 the S&P 500 was lower than in January 1973, even though consumer prices had more than doubled. Oil, coal and mining thrived while most industries lost ground to inflation. Then, when almost nobody wanted stocks, the biggest bull market in a generation began.",
    source: "industries",
    benchmark: "MARKET",
    companies: [
      { ticker: "Oil", name: "Oil", sector: "Energy" },
      { ticker: "Coal", name: "Coal", sector: "Energy" },
      { ticker: "Mines", name: "Mining", sector: "Energy" },
      { ticker: "Util", name: "Utilities", sector: "Energy" },
      { ticker: "BusEq", name: "Computers and office equipment", sector: "Tech" },
      { ticker: "Telcm", name: "Telephone and TV", sector: "Tech" },
      { ticker: "Autos", name: "Automakers", sector: "Industrial" },
      { ticker: "Steel", name: "Steel", sector: "Industrial" },
      { ticker: "Chems", name: "Chemicals", sector: "Industrial" },
      { ticker: "Cnstr", name: "Construction", sector: "Industrial" },
      { ticker: "Hlth", name: "Health care", sector: "Health" },
      { ticker: "Fin", name: "Banks and finance", sector: "Finance" },
      { ticker: "Trans", name: "Airlines, railroads and trucking", sector: "Travel" },
      { ticker: "Rtail", name: "Retail stores", sector: "Consumer" },
      { ticker: "Food", name: "Food", sector: "Consumer" },
      { ticker: "Meals", name: "Restaurants and hotels", sector: "Consumer" },
    ],
    events: [
      { month: "1973-01", headline: "The S&P 500 hits a record; the 'Nifty Fifty' growth stocks look unstoppable" },
      { month: "1973-10", headline: "The Arab oil embargo begins and oil prices start to quadruple" },
      { month: "1974-08", headline: "President Nixon resigns" },
      { month: "1974-10", headline: "Stocks bottom after falling 48% from the peak" },
      { month: "1979-01", headline: "Revolution in Iran sends oil prices soaring again" },
      { month: "1979-08", headline: "Paul Volcker becomes chair of the Federal Reserve" },
      { month: "1979-10", headline: "Volcker's Fed lets interest rates jump to fight inflation" },
      { month: "1980-03", headline: "Inflation peaks near 15% a year" },
      { month: "1980-11", headline: "Ronald Reagan wins the presidency" },
      { month: "1980-12", headline: "The prime lending rate hits a record 21.5%" },
      { month: "1982-08", headline: "Mexico's debt crisis pushes the Fed to cut rates, and a huge bull market begins" },
    ],
  },
  {
    id: "blackmonday",
    name: "Black Monday",
    years: "1985–1990",
    start: "1985-01",
    end: "1990-12",
    pitch: "Takeover fever and a record run. Then one Monday in October.",
    lesson:
      "Black Monday was the worst single day in stock market history, yet the S&P 500 was back above its pre-crash high by mid-1989. Investors who sold in a panic locked in the loss.",
    benchmark: "MARKET",
    companies: [
      { ticker: "IBM", name: "IBM", sector: "Tech" },
      { ticker: "AAPL", name: "Apple", sector: "Tech" },
      { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
      { ticker: "INTC", name: "Intel", sector: "Tech" },
      { ticker: "JPM", name: "JPMorgan", sector: "Finance" },
      { ticker: "AXP", name: "American Express", sector: "Finance" },
      { ticker: "XOM", name: "Exxon", sector: "Energy" },
      { ticker: "CVX", name: "Chevron", sector: "Energy" },
      { ticker: "KO", name: "Coca-Cola", sector: "Consumer" },
      { ticker: "PEP", name: "PepsiCo", sector: "Consumer" },
      { ticker: "MCD", name: "McDonald's", sector: "Consumer" },
      { ticker: "WMT", name: "Walmart", sector: "Consumer" },
      { ticker: "DIS", name: "Disney", sector: "Consumer" },
      { ticker: "GE", name: "General Electric", sector: "Industrial" },
      { ticker: "BA", name: "Boeing", sector: "Industrial" },
      { ticker: "F", name: "Ford", sector: "Industrial" },
      { ticker: "MRK", name: "Merck", sector: "Health" },
      { ticker: "JNJ", name: "Johnson & Johnson", sector: "Health" },
    ],
    events: [
      { month: "1985-09", headline: "The Plaza Accord: world powers agree to push the dollar down" },
      { month: "1986-03", headline: "Microsoft goes public" },
      { month: "1986-10", headline: "President Reagan signs a sweeping tax reform" },
      { month: "1987-08", headline: "Stocks hit a record high, up more than 40% this year" },
      { month: "1987-10", headline: "Black Monday: the Dow falls 22.6% in a single day" },
      { month: "1988-11", headline: "George H. W. Bush wins the presidency" },
      { month: "1989-10", headline: "A failed airline buyout triggers a Friday-the-13th mini crash" },
      { month: "1989-11", headline: "The Berlin Wall falls" },
      { month: "1990-07", headline: "A recession begins" },
      { month: "1990-08", headline: "Iraq invades Kuwait and oil prices spike" },
      { month: "1990-10", headline: "Stocks bottom after a 20% drop" },
    ],
  },
  {
    id: "dotcom",
    name: "The Dot-Com Bubble",
    years: "1998–2003",
    start: "1998-01",
    end: "2003-12",
    pitch: "Internet stocks can only go up. Right?",
    lesson:
      "Tech stocks that tripled into 2000 lost most of their value by 2002, while boring consumer and health companies held up. Valuations matter, and a diversified portfolio cushions a crash.",
    companies: [
      { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
      { ticker: "INTC", name: "Intel", sector: "Tech" },
      { ticker: "CSCO", name: "Cisco", sector: "Tech" },
      { ticker: "ORCL", name: "Oracle", sector: "Tech" },
      { ticker: "AMZN", name: "Amazon", sector: "Tech" },
      { ticker: "AAPL", name: "Apple", sector: "Tech" },
      { ticker: "QCOM", name: "Qualcomm", sector: "Tech" },
      { ticker: "IBM", name: "IBM", sector: "Tech" },
      { ticker: "JPM", name: "JPMorgan", sector: "Finance" },
      { ticker: "C", name: "Citigroup", sector: "Finance" },
      { ticker: "XOM", name: "Exxon Mobil", sector: "Energy" },
      { ticker: "GE", name: "General Electric", sector: "Industrial" },
      { ticker: "WMT", name: "Walmart", sector: "Consumer" },
      { ticker: "KO", name: "Coca-Cola", sector: "Consumer" },
      { ticker: "PG", name: "Procter & Gamble", sector: "Consumer" },
      { ticker: "JNJ", name: "Johnson & Johnson", sector: "Health" },
      { ticker: "PFE", name: "Pfizer", sector: "Health" },
    ],
    events: [
      { month: "1999-12", headline: "Y2K countdown: tech stocks are up big for the year as dot-com IPOs soar" },
      { month: "2000-03", headline: "The Nasdaq peaks above 5,000 on March 10, then starts to fall" },
      { month: "2001-09", headline: "September 11 attacks. U.S. stock markets close for four trading days" },
      { month: "2001-12", headline: "Enron files for bankruptcy after an accounting scandal" },
      { month: "2002-07", headline: "WorldCom files the largest U.S. bankruptcy to date" },
      { month: "2002-10", headline: "Stocks hit their bear-market low in early October" },
    ],
  },
  {
    id: "crisis",
    name: "The Financial Crisis",
    years: "2006–2011",
    start: "2006-01",
    end: "2011-12",
    pitch: "Housing never goes down nationally. Banks are safe.",
    lesson:
      "Bank stocks that looked cheap kept getting cheaper; AIG and Citigroup lost over 90%. Stocks bottomed in March 2009, when news was worst. Investors who sold in the panic missed the rebound.",
    companies: [
      { ticker: "JPM", name: "JPMorgan", sector: "Finance" },
      { ticker: "BAC", name: "Bank of America", sector: "Finance" },
      { ticker: "C", name: "Citigroup", sector: "Finance" },
      { ticker: "WFC", name: "Wells Fargo", sector: "Finance" },
      { ticker: "GS", name: "Goldman Sachs", sector: "Finance" },
      { ticker: "AIG", name: "AIG", sector: "Finance" },
      { ticker: "AAPL", name: "Apple", sector: "Tech" },
      { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
      { ticker: "GOOGL", name: "Alphabet (Google)", sector: "Tech" },
      { ticker: "AMZN", name: "Amazon", sector: "Tech" },
      { ticker: "XOM", name: "Exxon Mobil", sector: "Energy" },
      { ticker: "CVX", name: "Chevron", sector: "Energy" },
      { ticker: "HD", name: "Home Depot", sector: "Consumer" },
      { ticker: "WMT", name: "Walmart", sector: "Consumer" },
      { ticker: "MCD", name: "McDonald's", sector: "Consumer" },
      { ticker: "F", name: "Ford", sector: "Industrial" },
      { ticker: "JNJ", name: "Johnson & Johnson", sector: "Health" },
    ],
    events: [
      { month: "2007-04", headline: "Subprime lender New Century Financial files for bankruptcy" },
      { month: "2007-10", headline: "The S&P 500 hits a record high on October 9" },
      { month: "2008-03", headline: "Bear Stearns is sold to JPMorgan in an emergency rescue" },
      { month: "2008-09", headline: "Lehman Brothers files for bankruptcy. AIG gets a government bailout" },
      { month: "2008-10", headline: "Congress passes the $700 billion TARP bank rescue" },
      { month: "2009-03", headline: "Stocks hit bottom on March 9, down more than 50% from the peak" },
    ],
  },
  {
    id: "covid",
    name: "The COVID Crash",
    years: "2019–2021",
    start: "2019-07",
    end: "2021-12",
    pitch: "A virus shuts down the world. Some companies boom.",
    lesson:
      "The fastest crash on record was followed by one of the fastest recoveries. Travel stocks collapsed while stay-at-home stocks soared, then many of those winners gave gains back. Timing the bottom was nearly impossible.",
    companies: [
      { ticker: "AAPL", name: "Apple", sector: "Tech" },
      { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
      { ticker: "AMZN", name: "Amazon", sector: "Tech" },
      { ticker: "NVDA", name: "Nvidia", sector: "Tech" },
      { ticker: "ZM", name: "Zoom", sector: "Tech" },
      { ticker: "NFLX", name: "Netflix", sector: "Tech" },
      { ticker: "TSLA", name: "Tesla", sector: "Industrial" },
      { ticker: "DAL", name: "Delta Air Lines", sector: "Travel" },
      { ticker: "CCL", name: "Carnival Cruise", sector: "Travel" },
      { ticker: "MAR", name: "Marriott", sector: "Travel" },
      { ticker: "XOM", name: "Exxon Mobil", sector: "Energy" },
      { ticker: "JPM", name: "JPMorgan", sector: "Finance" },
      { ticker: "WMT", name: "Walmart", sector: "Consumer" },
      { ticker: "COST", name: "Costco", sector: "Consumer" },
      { ticker: "GME", name: "GameStop", sector: "Consumer" },
      { ticker: "PFE", name: "Pfizer", sector: "Health" },
      { ticker: "MRNA", name: "Moderna", sector: "Health" },
    ],
    events: [
      { month: "2020-02", headline: "COVID-19 spreads worldwide; stocks fall from a record high set February 19" },
      { month: "2020-03", headline: "Fastest crash on record. The Fed cuts rates to zero; Congress passes the $2.2T CARES Act" },
      { month: "2020-11", headline: "Pfizer announces its vaccine is over 90% effective" },
      { month: "2021-01", headline: "Reddit traders drive a GameStop short squeeze" },
      { month: "2021-08", headline: "The FDA grants full approval to the Pfizer vaccine" },
    ],
  },
  {
    id: "ai",
    name: "The AI Boom",
    years: "2022–2025",
    start: "2022-01",
    end: "2025-12",
    pitch: "Rates soar, then a chatbot changes everything.",
    lesson:
      "A handful of AI-linked giants drove most of the market's gains, so a portfolio without them lagged. Concentration cut both ways: huge winners, but sharp drops on news like DeepSeek and tariffs.",
    companies: [
      { ticker: "NVDA", name: "Nvidia", sector: "Tech" },
      { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
      { ticker: "GOOGL", name: "Alphabet (Google)", sector: "Tech" },
      { ticker: "META", name: "Meta", sector: "Tech" },
      { ticker: "AMZN", name: "Amazon", sector: "Tech" },
      { ticker: "AAPL", name: "Apple", sector: "Tech" },
      { ticker: "AMD", name: "AMD", sector: "Tech" },
      { ticker: "AVGO", name: "Broadcom", sector: "Tech" },
      { ticker: "INTC", name: "Intel", sector: "Tech" },
      { ticker: "PLTR", name: "Palantir", sector: "Tech" },
      { ticker: "TSLA", name: "Tesla", sector: "Industrial" },
      { ticker: "JPM", name: "JPMorgan", sector: "Finance" },
      { ticker: "XOM", name: "Exxon Mobil", sector: "Energy" },
      { ticker: "WMT", name: "Walmart", sector: "Consumer" },
      { ticker: "COST", name: "Costco", sector: "Consumer" },
      { ticker: "LLY", name: "Eli Lilly", sector: "Health" },
    ],
    events: [
      { month: "2022-03", headline: "The Fed starts raising interest rates to fight inflation" },
      { month: "2022-11", headline: "OpenAI launches ChatGPT" },
      { month: "2023-03", headline: "Silicon Valley Bank collapses" },
      { month: "2023-05", headline: "Nvidia forecasts a surge in AI chip demand; the stock jumps" },
      { month: "2024-06", headline: "Nvidia briefly becomes the world's most valuable company" },
      { month: "2025-01", headline: "China's DeepSeek releases a low-cost AI model, setting off a tech sell-off" },
      { month: "2025-04", headline: "Sweeping new tariffs send stocks tumbling" },
    ],
  },
];

export const eraById = (id: string) => ERAS.find((e) => e.id === id);

/** Months from start to end inclusive, as YYYY-MM strings. */
export function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}
