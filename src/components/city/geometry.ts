import * as THREE from "three";

/**
 * Unit box sitting on y = 0. The roof and floor faces point their UVs at a dark texel
 * so window textures only show on the walls.
 */
export function wallBox() {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
  for (const face of [2, 3]) for (let v = 0; v < 4; v++) uv.setXY(face * 4 + v, 0.002, 0.002);
  uv.needsUpdate = true;
  return g;
}

let shared: THREE.BoxGeometry | null = null;
export const sharedWallBox = () => (shared ??= wallBox());
