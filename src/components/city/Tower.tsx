"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Lot, TowerStyle } from "@/lib/cityplan";
import { sharedWallBox } from "./geometry";
import { tiled } from "./textures";

interface Tier {
  y0: number;
  y1: number;
  w: number;
  d: number;
}

const FOOT = 2.4;

/** Each style is a stack of tiers (fractions of the price-driven height) plus a fixed crown. */
const TIERS: Record<TowerStyle, Tier[]> = {
  setback: [
    { y0: 0, y1: 0.62, w: 1, d: 1 },
    { y0: 0.62, y1: 0.86, w: 0.78, d: 0.78 },
    { y0: 0.86, y1: 1, w: 0.56, d: 0.56 },
  ],
  spire: [
    { y0: 0, y1: 0.8, w: 1, d: 1 },
    { y0: 0.8, y1: 1, w: 0.68, d: 0.68 },
  ],
  deco: [
    { y0: 0, y1: 0.88, w: 1, d: 1 },
    { y0: 0.88, y1: 1, w: 0.84, d: 0.84 },
  ],
  glass: [{ y0: 0, y1: 1, w: 0.8, d: 1.08 }],
};

/** Height the crown adds above the tiers, so labels and beams sit on top of it. */
export const CROWN_H: Record<TowerStyle, number> = { setback: 0.5, spire: 4.6, deco: 2.9, glass: 0.6 };

export const UP = "#3cc6a8";
export const DOWN = "#ff6b57";
const FLAT = "#9aa6c4";

function Crown({ style, color, glow }: { style: TowerStyle; color: string; glow: number }) {
  const lit = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} />;
  const metal = <meshStandardMaterial color="#c9cfdf" metalness={0.75} roughness={0.3} emissive="#39405a" />;
  if (style === "setback")
    return (
      <>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[FOOT * 0.58, 0.16, FOOT * 0.58]} />
          {lit}
        </mesh>
        <mesh position={[FOOT * 0.1, 0.33, -FOOT * 0.08]}>
          <boxGeometry args={[0.5, 0.34, 0.45]} />
          <meshStandardMaterial color="#1b2238" />
        </mesh>
      </>
    );
  if (style === "spire")
    return (
      <>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[FOOT * 0.7, 0.2, FOOT * 0.7]} />
          {lit}
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[FOOT * 0.42, 0.7, FOOT * 0.42]} />
          <meshStandardMaterial color="#1f2740" />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <coneGeometry args={[0.32, 2.4, 8]} />
          {metal}
        </mesh>
        <mesh position={[0, 3.9, 0]}>
          <cylinderGeometry args={[0.025, 0.04, 1.4, 5]} />
          {metal}
        </mesh>
        <mesh position={[0, 4.62, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshBasicMaterial color="#ff3b30" />
        </mesh>
      </>
    );
  if (style === "deco")
    return (
      <>
        {[0.78, 0.6, 0.42].map((s, i) => (
          <mesh key={s} position={[0, 0.25 + i * 0.5, 0]}>
            <boxGeometry args={[FOOT * s, 0.5, FOOT * s]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow * (0.55 + i * 0.25)} />
          </mesh>
        ))}
        <mesh position={[0, 2.1, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.55, 1.6, 4]} />
          {metal}
        </mesh>
      </>
    );
  return (
    <>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[FOOT * 0.82, 0.12, FOOT * 1.1]} />
        {lit}
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 24]} />
        <meshStandardMaterial color="#232a40" />
      </mesh>
    </>
  );
}

export function Tower({
  lot,
  height,
  change,
  listed,
  owned,
  selected,
  onSelect,
  seed,
}: {
  lot: Lot;
  height: number;
  change: number;
  listed: boolean;
  owned: boolean;
  selected: boolean;
  onSelect: (t: string) => void;
  seed: number;
}) {
  const tiers = TIERS[lot.style];
  const glass = lot.style === "glass";
  const body = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const label = useRef<THREE.Group>(null);
  const tag = useRef<HTMLDivElement>(null);
  const beam = useRef<THREE.Mesh>(null);
  const cur = useRef(height);
  const [hover, setHover] = useState(false);
  const texes = useMemo(() => tiers.map((t) => tiled(seed, glass ? 1.6 : 3 * t.w, 1, glass)), [tiers, seed, glass]);

  useFrame(({ clock, camera }, dt) => {
    cur.current += (height - cur.current) * Math.min(1, dt * 3.5);
    const h = cur.current;
    if (body.current) body.current.scale.y = h;
    tiers.forEach((t, i) => texes[i].repeat.set(texes[i].repeat.x, Math.max(0.5, ((t.y1 - t.y0) * h) / (glass ? 3 : 1.6))));
    if (top.current) top.current.position.y = h;
    if (label.current) label.current.position.y = h + CROWN_H[lot.style] + 0.9;
    if (tag.current) {
      // Close to the ground, only nearby towers get a name tag, so the sky isn't full of labels.
      const d = Math.hypot(camera.position.x - lot.x, camera.position.z - lot.z);
      const far = camera.position.y < 2 ? 14 : 220;
      tag.current.style.opacity = selected || d < far ? "1" : "0";
    }
    if (beam.current) {
      beam.current.position.y = h + CROWN_H[lot.style] + 30;
      beam.current.rotation.z = Math.sin(clock.elapsedTime * 0.5 + seed) * 0.12;
      beam.current.rotation.x = Math.cos(clock.elapsedTime * 0.4 + seed) * 0.1;
    }
  });

  const color = !listed ? "#3b4260" : change > 0.0005 ? UP : change < -0.0005 ? DOWN : FLAT;
  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 5) return; // that was a camera drag, not a click
    onSelect(lot.ticker);
  };

  return (
    <group position={[lot.x, 0, lot.z]}>
      <group
        ref={body}
        onClick={pick}
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
        {tiers.map((t, i) => (
          <mesh key={i} geometry={sharedWallBox()} position={[0, t.y0, 0]} scale={[FOOT * t.w, t.y1 - t.y0, FOOT * t.d]}>
            <meshStandardMaterial
              color={selected ? "#3a4a7a" : hover ? "#2f3b66" : glass ? "#1a2b52" : "#222b48"}
              emissive="#ffffff"
              emissiveMap={listed ? texes[i] : null}
              emissiveIntensity={listed ? (selected || hover ? 1.35 : 1.05) : 0}
              metalness={glass ? 0.6 : 0.1}
              roughness={glass ? 0.25 : 0.8}
              transparent={!listed}
              opacity={listed ? 1 : 0.3}
            />
          </mesh>
        ))}
      </group>

      <group ref={top}>{listed && <Crown style={lot.style} color={color} glow={1.7} />}</group>

      {owned && listed && (
        <mesh ref={beam}>
          <cylinderGeometry args={[2.2, 0.25, 60, 24, 1, true]} />
          <meshBasicMaterial color="#ffd36b" transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} />
        </mesh>
      )}

      {selected && (
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.95, 2.25, 48]} />
          <meshBasicMaterial color="#ffb547" />
        </mesh>
      )}

      <group ref={label}>
        <Html center distanceFactor={30} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div
            ref={tag}
            className={`rounded px-1.5 transition-opacity duration-300 py-0.5 text-[12px] font-bold whitespace-nowrap [font-stretch:85%] ${
              selected ? "bg-glow text-night" : owned ? "bg-night/80 text-own ring-1 ring-own/60" : "bg-night/70 text-text"
            }`}
          >
            {lot.ticker}
            {!listed && <span className="ml-1 font-medium text-sub">not public yet</span>}
          </div>
        </Html>
      </group>
    </group>
  );
}
