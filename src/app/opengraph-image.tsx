import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Market City: a 3D night city where every tower is a real stock, from the 1929 crash to the AI boom";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (f: string) => readFile(join(process.cwd(), "assets", f));

/** Deterministic skyline so the card looks the same every time it's generated. */
function skyline() {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const towers: { x: number; w: number; h: number; crown: string | null; spire: boolean; windows: { x: number; y: number; c: string }[] }[] = [];
  for (let x = 650; x < 1200; ) {
    const w = 34 + Math.floor(rand() * 30);
    const mid = 1 - Math.abs(x - 920) / 380;
    const h = Math.round(110 + mid * 230 + rand() * 90);
    const crown = rand() < 0.55 ? (rand() < 0.62 ? "#3cc6a8" : "#ff6b57") : null;
    const windows: { x: number; y: number; c: string }[] = [];
    for (let r = 0; r < Math.floor((h - 14) / 13); r++)
      for (let c = 0; c < Math.floor((w - 8) / 9); c++) if (rand() < 0.3) windows.push({ x: 5 + c * 9, y: 10 + r * 13, c: rand() < 0.72 ? "#ffcf86" : "#dfe7ff" });
    towers.push({ x, w, h, crown, spire: rand() < 0.22, windows });
    x += w + 5 + Math.floor(rand() * 6);
  }
  return towers;
}

export default async function Image() {
  const [regular, heavy] = await Promise.all([font("Archivo-Regular.woff"), font("Archivo-ExtraBold.woff")]);
  const towers = skyline();
  const ground = 560;
  const lit = towers.reduce((a, t, i) => (t.h > towers[a].h && i > 2 ? i : a), 3);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "linear-gradient(180deg, #03050c 0%, #0b1230 60%, #231f48 100%)", color: "#eef1fa", fontFamily: "Archivo" }}>
        {/* Gold searchlight from a stock you own */}
        <div
          style={{
            position: "absolute",
            left: towers[lit].x + towers[lit].w / 2 - 90,
            top: 0,
            width: 180,
            height: ground - towers[lit].h,
            display: "flex",
            background: "linear-gradient(0deg, rgba(255,211,107,0.35) 0%, rgba(255,211,107,0.06) 100%)",
            clipPath: "polygon(0% 0%, 100% 0%, 54% 100%, 46% 100%)",
          }}
        />
        {/* Stars */}
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: (i * 197) % 1200, top: (i * 83) % 300, width: i % 7 === 0 ? 3 : 2, height: i % 7 === 0 ? 3 : 2, borderRadius: 2, background: "#ffffff", opacity: 0.25 + (i % 5) * 0.12, display: "flex" }} />
        ))}
        {/* Towers */}
        {towers.map((t, i) => (
          <div key={i} style={{ position: "absolute", left: t.x, top: ground - t.h, width: t.w, height: t.h, background: "#141b33", display: "flex" }}>
            {t.windows.map((w, k) => (
              <div key={k} style={{ position: "absolute", left: w.x, top: w.y, width: 4, height: 6, background: w.c, opacity: 0.85, display: "flex" }} />
            ))}
            {t.crown && <div style={{ position: "absolute", left: -2, top: -6, width: t.w + 4, height: 6, background: t.crown, display: "flex" }} />}
            {t.spire && <div style={{ position: "absolute", left: t.w / 2 - 2, top: -48, width: 4, height: 48, background: "#9aa3bd", display: "flex" }} />}
          </div>
        ))}
        {/* Water */}
        <div style={{ position: "absolute", left: 0, top: ground, width: 1200, height: 630 - ground, display: "flex", background: "linear-gradient(180deg, #0d1838 0%, #070b17 100%)" }} />
        {towers.map((t, i) =>
          i % 2 === 0 ? <div key={`r${i}`} style={{ position: "absolute", left: t.x + t.w * 0.3, top: ground + 10 + (i % 3) * 8, width: t.w * 0.4, height: 3, background: "#ffcf86", opacity: 0.2, display: "flex" }} /> : null,
        )}
        {/* Fade the city under the text */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 760, height: 630, display: "flex", background: "linear-gradient(90deg, rgba(5,8,20,0.96) 0%, rgba(5,8,20,0.85) 62%, rgba(5,8,20,0) 100%)" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "64px 72px", width: 700 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#ffb547" }}>Market City</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 70, lineHeight: 1.02, fontWeight: 800, letterSpacing: -2 }}>Every building is a real stock.</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 28, lineHeight: 1.35, color: "#9ba6c4" }}>
            Invest $10,000 through the 1929 crash, World War II, 2008, COVID and the AI boom. Fly through the city as prices rise and crash. Can you beat the market?
          </div>
          <div style={{ display: "flex", marginTop: 34, gap: 12 }}>
            {["8 real eras", "Buy or short", "Free to play"].map((t) => (
              <div key={t} style={{ display: "flex", padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(186,200,255,0.22)", fontSize: 20, color: "#eef1fa" }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Archivo", data: heavy, weight: 800, style: "normal" },
      ],
    },
  );
}
