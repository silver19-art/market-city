import { ERAS } from "@/lib/eras";
import Link from "next/link";

/** Simple illustrated skyline: each bar is a building, the lit windows are the hook. */
function Skyline() {
  const heights = [38, 62, 46, 88, 54, 120, 72, 96, 58, 140, 80, 66, 104, 50, 76, 44, 92, 60];
  return (
    <svg viewBox="0 0 720 170" className="h-auto w-full" aria-hidden="true">
      {heights.map((h, i) => {
        const x = i * 40 + 4;
        const up = i % 3 !== 1;
        return (
          <g key={i}>
            <rect x={x} y={170 - h} width="32" height={h} rx="2" fill="#221d4a" />
            {Array.from({ length: Math.floor(h / 14) }, (_, r) =>
              [6, 18].map((wx) => (
                <rect key={`${r}-${wx}`} x={x + wx} y={170 - h + 10 + r * 14} width="7" height="6" rx="1" fill={(i * 7 + r * 3 + wx) % 5 < 3 ? "#ffcf7a" : "#3a3470"} opacity={(i * 7 + r * 3 + wx) % 5 < 3 ? 0.85 : 1} />
              )),
            )}
            <rect x={x - 1} y={170 - h - 4} width="34" height="4" rx="1" fill={up ? "#2fb8a6" : "#f2705a"} />
          </g>
        );
      })}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-14 pb-20">
      <p className="text-sm font-extrabold tracking-tight text-glow">Market City</p>
      <h1 className="mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
        Every building is a real stock. Every month is real history.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-sub">
        Pick a market era, get $10,000, and watch the skyline rise and crash with actual prices. Buy and sell as history unfolds, then see if you beat the S&P 500.
      </p>

      <div className="mt-10">
        <Skyline />
      </div>

      <h2 className="mt-14 text-xl font-extrabold tracking-tight">Choose an era</h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {ERAS.map((e) => (
          <li key={e.id}>
            <Link href={`/play/${e.id}`} className="panel group flex h-full flex-col p-6 transition-colors hover:border-glow/50">
              <span className="num text-xs font-bold tracking-wide text-glow">{e.years}</span>
              <span className="mt-1 text-2xl font-extrabold tracking-tight">{e.name}</span>
              <span className="mt-2 text-sub">{e.pitch}</span>
              <span className="mt-4 flex flex-wrap gap-1.5">
                {e.companies.slice(0, 7).map((c) => (
                  <span key={c.ticker} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold text-sub">
                    {c.ticker}
                  </span>
                ))}
                <span className="rounded-md px-1 py-0.5 text-[11px] text-dim">+{e.companies.length - 7} more</span>
              </span>
              <span className="mt-5 text-sm font-bold text-glow group-hover:underline">Play this era →</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          ["Heights follow prices", "A building doubles in height when its stock doubles from the start of the era. Rooftops glow teal in up months and coral in down months."],
          ["Real news pauses the clock", "When something big happens, like Lehman failing or ChatGPT launching, the game stops so you can decide what to do."],
          ["Your report card", "At the end, see your return next to the S&P 500 and an evenly split portfolio, plus your worst drop and what you paid in fees."],
        ].map(([t, d]) => (
          <div key={t}>
            <h3 className="font-extrabold">{t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-sub">{d}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-edge pt-6 text-xs text-dim">
        Monthly prices adjusted for splits and dividends. Only companies still trading today are included. Educational game, not investment advice.
      </footer>
    </main>
  );
}
