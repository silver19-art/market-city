/** Reading for after a round: what actually happened in each period. Every link was checked when added. */
export interface LearnLink {
  title: string;
  source: string;
  url: string;
}

const wiki = (title: string, path: string): LearnLink => ({ title, source: "Wikipedia", url: `https://en.wikipedia.org/wiki/${path}` });
const fed = (title: string, slug: string): LearnLink => ({ title, source: "Federal Reserve History", url: `https://www.federalreservehistory.org/essays/${slug}` });

export const LEARN: Record<string, LearnLink[]> = {
  crash1929: [fed("Stock Market Crash of 1929", "stock-market-crash-of-1929"), fed("The Great Depression", "great-depression"), wiki("Wall Street crash of 1929", "Wall_Street_crash_of_1929")],
  ww2: [wiki("The US home front during World War II", "United_States_home_front_during_World_War_II"), wiki("Military production during World War II", "Military_production_during_World_War_II")],
  stagflation: [fed("The Great Inflation", "great-inflation"), wiki("The 1973 oil crisis", "1973_oil_crisis"), fed("Recession of 1981–82", "recession-of-1981-82")],
  blackmonday: [fed("Stock Market Crash of 1987", "stock-market-crash-of-1987"), wiki("Black Monday (1987)", "Black_Monday_(1987)")],
  dotcom: [wiki("The dot-com bubble", "Dot-com_bubble")],
  crisis: [fed("The Great Recession", "great-recession-of-200709"), fed("The Subprime Mortgage Crisis", "subprime-mortgage-crisis"), wiki("2008 financial crisis", "2008_financial_crisis")],
  covid: [wiki("2020 stock market crash", "2020_stock_market_crash"), wiki("Economic impact of the COVID-19 pandemic", "Economic_impact_of_the_COVID-19_pandemic")],
  ai: [wiki("The AI boom", "AI_boom"), wiki("The 2021–2023 inflation surge", "2021–2023_inflation_surge")],
  eurocrisis: [wiki("The eurozone crisis", "Eurozone_crisis"), wiki("Greek government-debt crisis", "Greek_government-debt_crisis")],
  abenomics: [wiki("Abenomics", "Abenomics"), wiki("Japan's Lost Decades", "Lost_Decades")],
  china2015: [wiki("2015–2016 Chinese stock market turbulence", "2015–2016_Chinese_stock_market_turbulence")],
};

/** Links for any stretch of years: the matching era's reading, then a year-by-year look at the US. */
export function learnForWindow(from: string, to: string, eraId: string | null): LearnLink[] {
  const years: LearnLink[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) years.push(wiki(`What happened in the US in ${y}`, `${y}_in_the_United_States`));
  return [...(eraId ? (LEARN[eraId] ?? []) : []), ...years];
}
