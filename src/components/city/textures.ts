import * as THREE from "three";
import { rng } from "@/lib/cityplan";

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Night office windows: a 4×8 grid per tile, roughly a third lit in warm or cool light.
 * Repeated vertically so a taller tower simply shows more floors.
 */
export function windowTexture(seed: number, glass = false) {
  const key = `${seed}:${glass}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 128);
  const rand = rng(seed * 7919 + 17);
  const cols = glass ? 8 : 4;
  const rows = glass ? 16 : 8;
  const cw = 64 / cols;
  const rh = 128 / rows;
  for (let y = 0; y < rows; y++) {
    const floorLit = rand() < 0.3; // whole floors tend to be on together
    for (let x = 0; x < cols; x++) {
      const r = rand();
      const lit = floorLit ? r < 0.75 : r < 0.22;
      if (!lit) {
        g.fillStyle = glass ? "rgba(70,110,170,0.10)" : "rgba(60,70,110,0.06)";
      } else {
        const tone = rand();
        g.fillStyle = tone < 0.62 ? `rgba(255,${190 + Math.floor(rand() * 40)},120,${0.55 + rand() * 0.4})` : tone < 0.9 ? `rgba(235,240,255,${0.5 + rand() * 0.4})` : `rgba(150,200,255,${0.5 + rand() * 0.4})`;
      }
      const pad = glass ? 0.8 : 2;
      g.fillRect(x * cw + pad, y * rh + pad + 1, cw - pad * 2, rh - pad * 2 - 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** A fresh texture object sharing the same image, so each tower tier can tile independently. */
export function tiled(seed: number, repeatX: number, repeatY: number, glass = false) {
  const t = windowTexture(seed, glass).clone();
  t.repeat.set(repeatX, repeatY);
  t.needsUpdate = true;
  return t;
}
