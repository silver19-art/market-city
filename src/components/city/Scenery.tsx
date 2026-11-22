"use client";

import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  AVENUE,
  BLOCK_D,
  BLOCK_W,
  ISLAND_D,
  ISLAND_W,
  PARK,
  RIVER,
  STREET,
  avenueXs,
  blockCenter,
  blocks,
  planFillers,
  rng,
  streetZs,
  type Filler,
} from "@/lib/cityplan";
import { sharedWallBox } from "./geometry";
import { windowTexture } from "./textures";

const tmp = new THREE.Object3D();
const col = new THREE.Color();

export const FOG = "#161d3d";

/** Gradient night sky: deep navy overhead, a violet city glow at the horizon. */
export function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color("#03050c") },
          mid: { value: new THREE.Color("#0c1331") },
          horizon: { value: new THREE.Color("#161d3d") },
        },
        vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vDir; void main(){ float h = vDir.y; vec3 c = mix(horizon, mid, smoothstep(-0.03, 0.3, h)); c = mix(c, top, smoothstep(0.3, 0.85, h)); gl_FragColor = vec4(c,1.0); }",
      }),
    [],
  );
  return (
    <>
      <mesh material={mat} renderOrder={-1}>
        <sphereGeometry args={[1100, 32, 16]} />
      </mesh>
      <Stars radius={320} depth={60} count={2500} factor={5} saturation={0} fade speed={0.4} />
      <mesh position={[-150, 150, -300]}>
        <sphereGeometry args={[9, 32, 16]} />
        <meshBasicMaterial color="#f4f1e4" fog={false} />
      </mesh>
    </>
  );
}

export function Lights() {
  return (
    <>
      <hemisphereLight args={["#5266b8", "#0a0c16", 0.55]} />
      <directionalLight position={[-150, 150, -300]} intensity={0.55} color="#b8c6ff" />
      <directionalLight position={[80, 40, 120]} intensity={0.25} color="#ffb877" />
      <ambientLight intensity={0.12} />
    </>
  );
}

/** Island, sidewalks, avenue markings, water and the far banks. */
export function Ground() {
  const blockList = useMemo(() => blocks().filter((b) => !b.park), []);
  const sidewalks = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = sidewalks.current;
    if (!m) return;
    blockList.forEach((b, i) => {
      tmp.position.set(b.x, 0.012, b.z);
      tmp.scale.set(BLOCK_W, 0.024, BLOCK_D);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [blockList]);

  return (
    <group>
      {/* Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#081230" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Island */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[ISLAND_W + 1.2, 0.7, ISLAND_D + 1.2]} />
        <meshStandardMaterial color="#1a2033" roughness={0.9} />
      </mesh>
      {/* Far banks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (ISLAND_W / 2 + RIVER + 70), -0.35, 0]}>
          <boxGeometry args={[140, 0.7, ISLAND_D + 220]} />
          <meshStandardMaterial color="#0c101d" roughness={1} />
        </mesh>
      ))}
      <instancedMesh ref={sidewalks} args={[undefined, undefined, blockList.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#283049" roughness={0.9} />
      </instancedMesh>
      {/* Faint avenue center lines */}
      {avenueXs().map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 0]}>
          <planeGeometry args={[0.025, ISLAND_D]} />
          <meshBasicMaterial color="#6b5a2c" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** Central park: lawn, a reservoir, trees and path lamps. */
export function Park() {
  const a = blockCenter(PARK.rows[0], PARK.cols[0]);
  const b = blockCenter(PARK.rows[1], PARK.cols[1]);
  const x0 = a.x - BLOCK_W / 2;
  const x1 = b.x + BLOCK_W / 2;
  const z0 = a.z - BLOCK_D / 2;
  const z1 = b.z + BLOCK_D / 2;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  const pond = { x: cx + w * 0.05, z: z0 + d * 0.3, rx: w * 0.22, rz: d * 0.14 };

  const trees = useMemo(() => {
    const rand = rng(77);
    const out: { x: number; z: number; s: number; t: number }[] = [];
    while (out.length < 260) {
      const x = x0 + 0.6 + rand() * (w - 1.2);
      const z = z0 + 0.6 + rand() * (d - 1.2);
      const inPond = ((x - pond.x) / (pond.rx + 0.6)) ** 2 + ((z - pond.z) / (pond.rz + 0.6)) ** 2 < 1;
      if (!inPond) out.push({ x, z, s: 0.45 + rand() * 0.4, t: rand() });
    }
    return out;
  }, [x0, z0, w, d, pond.x, pond.z, pond.rx, pond.rz]);

  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    trees.forEach((t, i) => {
      tmp.position.set(t.x, 0.3 + t.s * 0.45, t.z);
      tmp.scale.setScalar(t.s * 0.7);
      tmp.updateMatrix();
      crowns.current?.setMatrixAt(i, tmp.matrix);
      crowns.current?.setColorAt(i, col.set(t.t < 0.5 ? "#173d27" : t.t < 0.8 ? "#1d4a2f" : "#24553a"));
      tmp.position.set(t.x, 0.2, t.z);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      trunks.current?.setMatrixAt(i, tmp.matrix);
    });
    const rand = rng(91);
    for (let i = 0; i < 40; i++) {
      tmp.position.set(x0 + 1 + rand() * (w - 2), 0.3, z0 + 1 + rand() * (d - 2));
      tmp.updateMatrix();
      lamps.current?.setMatrixAt(i, tmp.matrix);
    }
    for (const m of [crowns.current, trunks.current, lamps.current]) if (m) m.instanceMatrix.needsUpdate = true;
    if (crowns.current?.instanceColor) crowns.current.instanceColor.needsUpdate = true;
  }, [trees, x0, z0, w, d]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.03, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#10261a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pond.x, 0.05, pond.z]} scale={[pond.rx, pond.rz, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#0c1c3d" roughness={0.1} metalness={0.6} />
      </mesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}>
        <cylinderGeometry args={[0.03, 0.045, 0.4, 5]} />
        <meshStandardMaterial color="#2a2018" />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, 40]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshBasicMaterial color="#ffd391" />
      </instancedMesh>
    </group>
  );
}

/** Sodium streetlights at every intersection, on both sides of each avenue. */
export function Streetlights() {
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    for (const x of avenueXs()) for (const z of streetZs()) for (const s of [-1, 1]) out.push([x + s * (AVENUE / 2 - 0.12), z + STREET / 2 + 0.2]);
    return out;
  }, []);
  const poles = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    spots.forEach(([x, z], i) => {
      tmp.position.set(x, 0.25, z);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      poles.current?.setMatrixAt(i, tmp.matrix);
      tmp.position.set(x, 0.51, z);
      tmp.updateMatrix();
      bulbs.current?.setMatrixAt(i, tmp.matrix);
    });
    if (poles.current) poles.current.instanceMatrix.needsUpdate = true;
    if (bulbs.current) bulbs.current.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.012, 0.018, 0.5, 5]} />
        <meshStandardMaterial color="#20263a" />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, spots.length]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshBasicMaterial color="#ffb85c" />
      </instancedMesh>
    </group>
  );
}

interface Car {
  axis: "x" | "z";
  lane: number;
  pos: number;
  dir: 1 | -1;
  speed: number;
}

/** Headlight and taillight streaks moving along the avenues and a few cross streets. */
export function Traffic() {
  const cars = useMemo(() => {
    const rand = rng(5);
    const out: Car[] = [];
    for (const x of avenueXs())
      for (let k = 0; k < 16; k++) {
        const dir = rand() < 0.5 ? 1 : -1;
        out.push({ axis: "z", lane: x + dir * 0.35, pos: (rand() - 0.5) * ISLAND_D, dir, speed: 2.5 + rand() * 3 });
      }
    const zs = streetZs();
    for (let k = 0; k < 36; k++) {
      const dir = rand() < 0.5 ? 1 : -1;
      out.push({ axis: "x", lane: zs[Math.floor(rand() * zs.length)] + dir * 0.22, pos: (rand() - 0.5) * ISLAND_W, dir, speed: 1.8 + rand() * 2 });
    }
    return out;
  }, []);
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    // Cars driving toward the harbor camera show headlights; cars driving away show taillights.
    cars.forEach((c, i) => mesh.current?.setColorAt(i, col.set(c.dir === 1 ? "#fff3d6" : "#ff3b30")));
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [cars]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const m = mesh.current;
    if (!m) return;
    cars.forEach((c, i) => {
      const half = (c.axis === "z" ? ISLAND_D : ISLAND_W) / 2;
      c.pos += c.dir * c.speed * dt;
      if (c.pos > half) c.pos = -half;
      if (c.pos < -half) c.pos = half;
      if (c.axis === "z") {
        tmp.position.set(c.lane, 0.05, c.pos);
        tmp.rotation.set(0, 0, 0);
      } else {
        tmp.position.set(c.pos, 0.05, c.lane);
        tmp.rotation.set(0, Math.PI / 2, 0);
      }
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, cars.length]}>
      <boxGeometry args={[0.12, 0.06, 0.28]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

/** Suspension bridge over the east river with necklace lights along the main cables. */
export function Bridge() {
  const z = streetZs()[19];
  const x0 = ISLAND_W / 2 - 0.4;
  const x1 = ISLAND_W / 2 + RIVER + 0.6;
  const t0 = x0 + 4.2;
  const t1 = x1 - 4.2;
  const deckY = 1.5;
  const towerH = 8;

  const { cables, beads, hangers } = useMemo(() => {
    const cableAt = (x: number) => {
      if (x < t0) return deckY + 0.2 + ((x - x0) / (t0 - x0)) * (towerH - deckY - 0.2);
      if (x > t1) return deckY + 0.2 + ((x1 - x) / (x1 - t1)) * (towerH - deckY - 0.2);
      const u = (x - t0) / (t1 - t0);
      return deckY + 0.4 + (towerH - deckY - 0.4) * (2 * u - 1) ** 2;
    };
    const cables: THREE.TubeGeometry[] = [];
    const beads: THREE.Vector3[] = [];
    const hangers: { x: number; y: number; z: number; h: number }[] = [];
    for (const side of [-0.85, 0.85]) {
      const pts: THREE.Vector3[] = [];
      for (let x = x0; x <= x1 + 0.01; x += 0.4) pts.push(new THREE.Vector3(x, cableAt(x), z + side));
      cables.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.035, 5));
      for (let x = x0 + 0.4; x < x1; x += 0.8) {
        beads.push(new THREE.Vector3(x, cableAt(x) + 0.05, z + side));
        const h = cableAt(x) - deckY;
        if (h > 0.25) hangers.push({ x, y: deckY + h / 2, z: z + side, h });
      }
    }
    return { cables, beads, hangers };
  }, [z, x0, x1, t0, t1]);

  const beadMesh = useRef<THREE.InstancedMesh>(null);
  const hangerMesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    beads.forEach((p, i) => {
      tmp.position.copy(p);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      beadMesh.current?.setMatrixAt(i, tmp.matrix);
    });
    hangers.forEach((h, i) => {
      tmp.position.set(h.x, h.y, h.z);
      tmp.scale.set(1, h.h, 1);
      tmp.updateMatrix();
      hangerMesh.current?.setMatrixAt(i, tmp.matrix);
    });
    if (beadMesh.current) beadMesh.current.instanceMatrix.needsUpdate = true;
    if (hangerMesh.current) hangerMesh.current.instanceMatrix.needsUpdate = true;
  }, [beads, hangers]);

  const stone = <meshStandardMaterial color="#3a3f52" roughness={0.85} />;
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, deckY, z]}>
        <boxGeometry args={[x1 - x0, 0.22, 1.9]} />
        <meshStandardMaterial color="#232838" />
      </mesh>
      {[t0, t1].map((tx) => (
        <group key={tx} position={[tx, 0, z]}>
          {[-0.85, 0.85].map((s) => (
            <mesh key={s} position={[0, towerH / 2 - 0.2, s]}>
              <boxGeometry args={[0.5, towerH + 0.4, 0.42]} />
              {stone}
            </mesh>
          ))}
          {[4.2, towerH - 0.3].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[0.5, 0.5, 2.1]} />
              {stone}
            </mesh>
          ))}
          <mesh position={[0, towerH + 0.3, 0]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshBasicMaterial color="#ff4a3d" />
          </mesh>
        </group>
      ))}
      {cables.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#8b93ad" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <instancedMesh ref={hangerMesh} args={[undefined, undefined, hangers.length]}>
        <boxGeometry args={[0.015, 1, 0.015]} />
        <meshBasicMaterial color="#59617a" />
      </instancedMesh>
      <instancedMesh ref={beadMesh} args={[undefined, undefined, beads.length]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshBasicMaterial color="#fff6dc" />
      </instancedMesh>
    </group>
  );
}

const BUCKETS = [
  { max: 3.5, seed: 3 },
  { max: 7, seed: 11 },
  { max: Infinity, seed: 29 },
];

function FillerBucket({ list, seed }: { list: Filler[]; seed: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const avgH = list.reduce((a, f) => a + f.h, 0) / Math.max(1, list.length);
  const tex = useMemo(() => {
    const t = windowTexture(seed).clone();
    t.repeat.set(2.4, Math.max(1, avgH / 1.6));
    t.needsUpdate = true;
    return t;
  }, [seed, avgH]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    list.forEach((f, i) => {
      tmp.position.set(f.x, 0, f.z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(f.w, f.h, f.d);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, col.setHSL(0.62 + f.tint * 0.06, 0.18 + f.tint * 0.1, 0.07 + f.tint * 0.05));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [list]);
  if (!list.length) return null;
  return (
    <instancedMesh ref={mesh} args={[sharedWallBox(), undefined, list.length]}>
      <meshStandardMaterial emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.75} roughness={0.85} />
    </instancedMesh>
  );
}

/** Hundreds of background buildings, plus red aviation lights blinking on the tallest. */
export function Skyline({ used }: { used: Set<string> }) {
  const fillers = useMemo(() => planFillers(used), [used]);
  const buckets = useMemo(() => {
    return BUCKETS.map((b, i) => {
      const lo = i === 0 ? 0 : BUCKETS[i - 1].max;
      return { ...b, list: fillers.filter((f) => f.h >= lo && f.h < b.max) };
    });
  }, [fillers]);
  const tall = useMemo(() => fillers.filter((f) => f.h > 8), [fillers]);
  const beacons = useRef<THREE.InstancedMesh>(null);
  const beaconMat = useRef<THREE.MeshBasicMaterial>(null);
  useLayoutEffect(() => {
    tall.forEach((f, i) => {
      tmp.position.set(f.x, f.h + 0.12, f.z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      beacons.current?.setMatrixAt(i, tmp.matrix);
    });
    if (beacons.current) beacons.current.instanceMatrix.needsUpdate = true;
  }, [tall]);
  useFrame(({ clock }) => {
    if (beaconMat.current) beaconMat.current.opacity = 0.25 + 0.75 * (Math.sin(clock.elapsedTime * 2.4) > 0.6 ? 1 : 0);
  });
  return (
    <group>
      {buckets.map((b) => (
        <FillerBucket key={b.seed} list={b.list} seed={b.seed} />
      ))}
      {tall.length > 0 && (
        <instancedMesh ref={beacons} args={[undefined, undefined, tall.length]}>
          <sphereGeometry args={[0.1, 6, 5]} />
          <meshBasicMaterial ref={beaconMat} color="#ff3b30" transparent />
        </instancedMesh>
      )}
    </group>
  );
}
