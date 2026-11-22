"use client";

import type { Company } from "@/lib/eras";
import type { Prices } from "@/lib/engine";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const SPACING = 3.2;
const DISTRICT_GAP = 2.4;
const MAX_H = 24;

/** Height from price relative to the era's first price: doubling always adds the same height. */
export function heightFor(price: number | null, base: number | null): number {
  if (!price || !base) return 0.15;
  return Math.min(MAX_H, Math.max(0.3, 4 * (1 + Math.log2(price / base))));
}

function windowTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b0a1c";
  g.fillRect(0, 0, 32, 64);
  let s = seed;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 3; y < 64; y += 8)
    for (let x = 3; x < 32; x += 8) {
      const r = rand();
      g.fillStyle = r > 0.72 ? `rgba(255, ${185 + Math.floor(r * 50)}, 110, ${0.45 + r * 0.35})` : "rgba(120, 130, 200, 0.08)";
      g.fillRect(x, y, 3, 3);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

interface Placed extends Company {
  x: number;
  z: number;
}

/** Lay out sector districts left to right, buildings in a small grid inside each. */
export function layout(companies: Company[]) {
  const bySector = new Map<string, Company[]>();
  for (const c of companies) bySector.set(c.sector, [...(bySector.get(c.sector) ?? []), c]);
  const sectors = [...bySector.entries()].sort((a, b) => b[1].length - a[1].length);
  const placed: Placed[] = [];
  const districts: { sector: string; x: number; z: number; w: number; d: number }[] = [];
  let cursor = 0;
  for (const [sector, list] of sectors) {
    const cols = list.length > 4 ? 3 : list.length > 1 ? 2 : 1;
    const rows = Math.ceil(list.length / cols);
    const w = cols * SPACING;
    const d = rows * SPACING;
    list.forEach((c, i) => {
      placed.push({ ...c, x: cursor + (i % cols) * SPACING + SPACING / 2, z: Math.floor(i / cols) * SPACING + SPACING / 2 - d / 2 });
    });
    districts.push({ sector, x: cursor + w / 2, z: 0, w, d });
    cursor += w + DISTRICT_GAP;
  }
  const shift = (cursor - DISTRICT_GAP) / 2;
  return {
    placed: placed.map((p) => ({ ...p, x: p.x - shift })),
    districts: districts.map((d) => ({ ...d, x: d.x - shift })),
    width: cursor,
  };
}

function Building({
  c,
  height,
  change,
  owned,
  selected,
  listed,
  onSelect,
  seed,
}: {
  c: Placed;
  height: number;
  change: number;
  owned: boolean;
  selected: boolean;
  listed: boolean;
  onSelect: (t: string) => void;
  seed: number;
}) {
  const body = useRef<THREE.Mesh>(null);
  const roof = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const label = useRef<THREE.Group>(null);
  const cur = useRef(height);
  const [hover, setHover] = useState(false);
  const tex = useMemo(() => windowTexture(seed), [seed]);

  useFrame((_, dt) => {
    cur.current += (height - cur.current) * Math.min(1, dt * 4);
    const h = cur.current;
    if (body.current) {
      body.current.scale.y = h;
      body.current.position.y = h / 2;
    }
    tex.repeat.set(1.5, Math.max(1, h / 1.6));
    if (roof.current) roof.current.position.y = h + 0.06;
    if (beacon.current) {
      beacon.current.position.y = h + 1.6;
      beacon.current.rotation.y += dt * 1.5;
    }
    if (label.current) label.current.position.y = h + (owned ? 3.4 : 1.1);
  });

  const roofColor = !listed ? "#3b3660" : change > 0.0005 ? "#2fb8a6" : change < -0.0005 ? "#f2705a" : "#8f89b8";

  return (
    <group position={[c.x, 0, c.z]}>
      <mesh
        ref={body}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(c.ticker);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[1.7, 1, 1.7]} />
        <meshStandardMaterial
          color={selected ? "#3c3478" : hover ? "#2e2963" : "#221d4a"}
          emissive="#ffffff"
          emissiveMap={listed ? tex : null}
          emissiveIntensity={listed ? 0.6 : 0}
          roughness={0.8}
          transparent={!listed}
          opacity={listed ? 1 : 0.35}
        />
      </mesh>
      <mesh ref={roof}>
        <boxGeometry args={[1.78, 0.12, 1.78]} />
        <meshStandardMaterial color={roofColor} emissive={roofColor} emissiveIntensity={listed ? 1.4 : 0.2} />
      </mesh>
      {owned && (
        <mesh ref={beacon}>
          <octahedronGeometry args={[0.45]} />
          <meshStandardMaterial color="#ffd36b" emissive="#ffb43a" emissiveIntensity={2.2} />
        </mesh>
      )}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.35, 1.6, 40]} />
          <meshBasicMaterial color="#ffc566" />
        </mesh>
      )}
      <group ref={label}>
        <Html center distanceFactor={22} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap ${
              selected ? "bg-glow text-night" : "bg-night/70 text-text"
            }`}
          >
            {c.ticker}
            {!listed && <span className="ml-1 font-medium text-sub">soon</span>}
          </div>
        </Html>
      </group>
    </group>
  );
}

export interface CityProps {
  companies: Company[];
  prices: Prices;
  month: number;
  owned: Set<string>;
  selected: string | null;
  onSelect: (t: string | null) => void;
  autoRotate: boolean;
}

export default function City({ companies, prices, month, owned, selected, onSelect, autoRotate }: CityProps) {
  const { placed, districts, width } = useMemo(() => layout(companies), [companies]);
  const bases = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const c of companies) out[c.ticker] = prices[c.ticker]?.find((v) => v != null) ?? null;
    return out;
  }, [companies, prices]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, Math.max(22, width * 0.5), Math.max(34, width * 0.95)], fov: 38 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true }}
    >
      <fog attach="fog" args={["#1b1640", 55, 150]} />
      <hemisphereLight args={["#8b7cff", "#1a1235", 0.65]} />
      <directionalLight position={[18, 30, 12]} intensity={1.1} color="#ffd8b0" castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 1, 90]} />
      </directionalLight>
      <ambientLight intensity={0.15} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#120f2b" />
      </mesh>
      {districts.map((d) => (
        <group key={d.sector} position={[d.x, 0.01, d.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[d.w + 0.8, d.d + 0.8]} />
            <meshStandardMaterial color="#1d1945" />
          </mesh>
          <Html position={[0, 0, d.d / 2 + 1.3]} center distanceFactor={26} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
            <div className="text-[12px] font-semibold tracking-wide whitespace-nowrap text-sub">{d.sector}</div>
          </Html>
        </group>
      ))}

      {placed.map((c, i) => {
        const p = prices[c.ticker]?.[month] ?? null;
        const prev = prices[c.ticker]?.[month - 1] ?? null;
        return (
          <Building
            key={c.ticker}
            c={c}
            seed={i * 7919 + 13}
            height={heightFor(p, bases[c.ticker])}
            change={p && prev ? p / prev - 1 : 0}
            listed={p != null}
            owned={owned.has(c.ticker)}
            selected={selected === c.ticker}
            onSelect={onSelect}
          />
        );
      })}

      <OrbitControls
        target={[0, 3, 0]}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
        minDistance={14}
        maxDistance={110}
        maxPolarAngle={1.32}
        minPolarAngle={0.35}
        enableDamping
      />
    </Canvas>
  );
}
