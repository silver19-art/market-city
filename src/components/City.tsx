"use client";

import type { Company } from "@/lib/eras";
import type { Prices } from "@/lib/engine";
import { planStocks } from "@/lib/cityplan";
import { Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CameraRig, type CamMode, type Focus } from "./city/CameraRig";
import { Bridge, FOG, Ground, Lights, Park, Sky, Skyline, Streetlights, Traffic } from "./city/Scenery";
import { CROWN_H, Tower } from "./city/Tower";

const MAX_H = 24;
const SCALE = 1.5;

/** Height from price relative to the era's first price: doubling always adds the same height. */
export function heightFor(price: number | null, base: number | null): number {
  if (!price || !base) return 0.15;
  return Math.min(MAX_H, Math.max(0.3, 4 * (1 + Math.log2(price / base))));
}

/** Neighborhood name painted near the ground; shown only from up high so it never floats over towers. */
function HoodLabel({ sector, x, z }: { sector: string; x: number; z: number }) {
  const el = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    if (el.current) el.current.style.opacity = camera.position.y > 18 ? "1" : "0";
  });
  return (
    <Html position={[x, 0.3, z]} center distanceFactor={40} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <div ref={el} className="text-[15px] font-extrabold whitespace-nowrap text-glow/80 transition-opacity duration-300 [font-stretch:75%]">
        {sector}
      </div>
    </Html>
  );
}

export interface CityProps {
  companies: Company[];
  prices: Prices;
  month: number;
  owned: Set<string>;
  shorted: Set<string>;
  selected: string | null;
  onSelect: (t: string | null) => void;
  mode: CamMode;
}

export default function City({ companies, prices, month, owned, shorted, selected, onSelect, mode }: CityProps) {
  const plan = useMemo(() => planStocks(companies), [companies]);
  const bases = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const c of companies) out[c.ticker] = prices[c.ticker]?.find((v) => v != null) ?? null;
    return out;
  }, [companies, prices]);
  const heights = useMemo(() => {
    const out: Record<string, number> = {};
    for (const l of plan.lots) out[l.ticker] = heightFor(prices[l.ticker]?.[month] ?? null, bases[l.ticker]) * SCALE;
    return out;
  }, [plan, prices, month, bases]);

  const lot = plan.lots.find((l) => l.ticker === selected);
  const focus: Focus | null = lot ? { ticker: lot.ticker, x: lot.x, z: lot.z, h: heights[lot.ticker] + CROWN_H[lot.style] } : null;

  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [40, 36, plan.center + 56], fov: 45, near: 0.02, far: 2600 }} onPointerMissed={(e) => e.type === "click" && onSelect(null)} gl={{ antialias: true }}>
      <color attach="background" args={["#05070f"]} />
      <fog attach="fog" args={[FOG, 60, 250]} />
      <Sky />
      <Lights />
      <Ground />
      <Park />
      <Streetlights />
      <Traffic />
      <Bridge />
      <Skyline used={plan.used} />

      {plan.hoods.map((h) => (
        <HoodLabel key={h.sector} {...h} />
      ))}

      {plan.lots.map((l, i) => {
        const p = prices[l.ticker]?.[month] ?? null;
        const prev = prices[l.ticker]?.[month - 1] ?? null;
        return (
          <Tower
            key={l.ticker}
            lot={l}
            seed={i * 31 + 7}
            height={heights[l.ticker]}
            change={p && prev ? p / prev - 1 : 0}
            listed={p != null}
            owned={owned.has(l.ticker)}
            shorted={shorted.has(l.ticker)}
            selected={selected === l.ticker}
            onSelect={onSelect}
          />
        );
      })}

      <CameraRig mode={mode} focus={focus} centerZ={plan.center} />
    </Canvas>
  );
}
