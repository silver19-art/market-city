import { ERAS } from "@/lib/eras";
import { DailyCard, EraProgress, ProgressPanel } from "@/components/Progress";
import Link from "next/link";

/** A Manhattan skyline at night with a suspension bridge, drawn from a fixed seed so it never changes. */
function Skyline() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const W = 1200;
  const H = 300;
  const ground = 230;
  type B = { x: number; w: number; h: number; kind: number; up: boolean };
  const back: B[] = [];
  const front: B[] = [];
  for (let x = 0; x < 860; ) {
    const w = 22 + rand() * 26;
    back.push({ x, w, h: 40 + rand() * 70, kind: 0, up: true });
    x += w + 2;
  }
  for (let x = 6; x < 840; ) {
    const w = 30 + rand() * 30;
    const mid = 1 - Math.abs(x - 420) / 460;
    front.push({ x, w, h: 50 + mid * 120 + rand() * 60, kind: Math.floor(rand() * 4), up: rand() > 0.35 });
    x += w + 6 + rand() * 8;
  }
  const windows = (b: B, top: number) =>
    Array.from({ length: Math.floor((ground - top - 8) / 9) }, (_, r) =>
      Array.from({ length: Math.floor((b.w - 6) / 7) }, (_, c) => {
        const lit = rand() < 0.3;
        return lit ? <rect key={`${r}-${c}`} x={b.x + 4 + c * 7} y={top + 6 + r * 9} width="3" height="4" fill={rand() < 0.7 ? "#ffcf86" : "#dfe7ff"} opacity={0.55 + rand() * 0.4} /> : null;
      }),
    );
  const tower = (b: B, i: number) => {
    const top = ground - b.h;
    const crown = b.up ? "#3cc6a8" : "#ff6b57";
    const body = "#141b33";
    return (
      <g key={i}>
        {b.kind === 0 && (
          <>
            <rect x={b.x} y={top + b.h * 0.3} width={b.w} height={b.h * 0.7} fill={body} />
            <rect x={b.x + b.w * 0.12} y={top + b.h * 0.12} width={b.w * 0.76} height={b.h * 0.2} fill={body} />
            <rect x={b.x + b.w * 0.25} y={top} width={b.w * 0.5} height={b.h * 0.13} fill={body} />
            <rect x={b.x + b.w * 0.25} y={top - 3} width={b.w * 0.5} height="3" fill={crown} />
          </>
        )}
        {b.kind === 1 && (
          <>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={body} />
            <rect x={b.x + b.w * 0.2} y={top - 12} width={b.w * 0.6} height="12" fill={body} />
            <rect x={b.x + b.w * 0.2} y={top - 15} width={b.w * 0.6} height="3" fill={crown} />
            <polygon points={`${b.x + b.w / 2 - 4},${top - 15} ${b.x + b.w / 2 + 4},${top - 15} ${b.x + b.w / 2},${top - 52}`} fill="#9aa3bd" />
          </>
        )}
        {b.kind === 2 && (
          <>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={body} />
            {[0.8, 0.6, 0.4].map((s, k) => (
              <rect key={k} x={b.x + (b.w * (1 - s)) / 2} y={top - 7 * (k + 1)} width={b.w * s} height="7" fill={crown} opacity={0.5 + k * 0.2} />
            ))}
            <polygon points={`${b.x + b.w * 0.36},${top - 21} ${b.x + b.w * 0.64},${top - 21} ${b.x + b.w / 2},${top - 34}`} fill="#9aa3bd" />
          </>
        )}
        {b.kind === 3 && (
          <>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill="#122242" />
            <rect x={b.x} y={top - 3} width={b.w} height="3" fill={crown} />
          </>
        )}
        {windows(b, b.kind === 0 ? top + b.h * 0.3 : top)}
      </g>
    );
  };
  // Bridge from the island to the far bank.
  const bx0 = 860;
  const bx1 = 1200;
  const t0 = 930;
  const t1 = 1130;
  const deck = 196;
  const cable = (x: number) => {
    if (x < t0) return deck - ((x - bx0) / (t0 - bx0)) * 92;
    if (x > t1) return deck - ((bx1 - x) / (bx1 - t1)) * 92;
    const u = (x - t0) / (t1 - t0);
    return deck - 4 - 88 * (2 * u - 1) ** 2;
  };
  const beads = Array.from({ length: 56 }, (_, i) => bx0 + 4 + i * 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Night skyline of towers beside a lit suspension bridge">
      <defs>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0d1838" />
          <stop offset="1" stopColor="#070b17" />
        </linearGradient>
      </defs>
      {back.map((b, i) => (
        <rect key={`b${i}`} x={b.x} y={ground - b.h} width={b.w} height={b.h} fill="#0c1226" />
      ))}
      {front.map(tower)}
      <rect x="0" y={ground} width={W} height={H - ground} fill="url(#water)" />
      {/* Reflections */}
      {front.map((b, i) =>
        i % 2 === 0 ? <rect key={`r${i}`} x={b.x + b.w * 0.3} y={ground + 6 + (i % 3) * 5} width={b.w * 0.4} height="2" fill="#ffcf86" opacity="0.18" /> : null,
      )}
      <path d={`M${bx0} ${deck}H${bx1}`} stroke="#2b3350" strokeWidth="5" />
      {[t0, t1].map((x) => (
        <g key={x}>
          <rect x={x - 6} y={deck - 98} width="12" height={ground - deck + 98} fill="#2e3550" />
          <rect x={x - 6} y={deck - 60} width="12" height="5" fill="#070b17" />
          <circle cx={x} cy={deck - 102} r="2.5" fill="#ff3b30" />
        </g>
      ))}
      <path d={beads.map((x, i) => `${i ? "L" : "M"}${x} ${cable(x)}`).join(" ")} stroke="#6f7894" strokeWidth="1.2" fill="none" />
      {beads.map((x) => (
        <circle key={x} cx={x} cy={cable(x)} r="1.6" fill="#fff6dc" />
      ))}
      {beads.map((x) => (
        <rect key={`h${x}`} x={x} y={cable(x)} width="0.6" height={deck - cable(x)} fill="#4a5270" />
      ))}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-14 pb-20">
      <p className="sign text-lg font-extrabold text-glow">Market City</p>
      <h1 className="mt-4 max-w-4xl text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.95] font-extrabold">
        Every building is a real stock. Every month is real history.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-sub">
        Pick a market era, get $10,000, and fly or walk through a New York–style city whose towers rise and crash with actual prices. Buy and sell as history unfolds, then see if you beat the S&P 500.
      </p>

      <div className="-mx-5 mt-10 sm:mx-0">
        <Skyline />
      </div>

      <DailyCard />
      <ProgressPanel />

      <h2 className="mt-14 text-xl font-extrabold tracking-tight">Choose an era, from 1928 to today</h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {ERAS.map((e) => (
          <li key={e.id}>
            <Link href={`/play/${e.id}`} className="panel group flex h-full flex-col p-6 transition-colors hover:border-glow/50">
              <span className="num text-xs font-bold text-glow">{e.years}</span>
              <span className="sign mt-1 text-3xl font-extrabold">{e.name}</span>
              <span className="mt-2 text-sub">{e.pitch}</span>
              {e.source === "industries" && <span className="mt-2 text-xs text-dim">Before stock-by-stock records, so each tower is a whole industry.</span>}
              <EraProgress id={e.id} />
              <span className="mt-4 flex flex-wrap gap-1.5">
                {e.companies.slice(0, 7).map((c) => (
                  <span key={c.ticker} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold text-sub">
                    {c.ticker}
                  </span>
                ))}
                <span className="rounded-md px-1 py-0.5 text-[11px] text-dim">+{e.companies.length - 7} more</span>
              </span>
              <span className="mt-5 text-sm font-bold text-glow group-hover:underline">Play this era</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Heights follow prices", "A tower gains the same number of floors every time its stock doubles. Crowns glow teal in up months and coral in down months, and stocks you own shine a gold searchlight."],
          ["Fly or walk", "Circle the island, fly between towers with W A S D, or drop to street level and walk the avenues past the park, the traffic and the bridge."],
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
