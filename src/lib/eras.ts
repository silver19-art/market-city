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
}

export const BENCHMARK = "SPY";

export const ERAS: Era[] = [
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
