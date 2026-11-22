import type { Company } from "./eras";

/**
 * A Manhattan-style island. Avenues run north–south (along z), streets east–west (along x).
 * North is negative z, so the default camera looks up the island from the harbor.
 */
export const COLS = 5;
export const ROWS = 22;
export const BLOCK_W = 8; // along x
export const BLOCK_D = 4.4; // along z
export const AVENUE = 1.8;
export const STREET = 1.2;
export const ISLAND_W = COLS * BLOCK_W + (COLS + 1) * AVENUE;
export const ISLAND_D = ROWS * BLOCK_D + (ROWS + 1) * STREET;
export const RIVER = 20;
export const PARK = { rows: [3, 8] as const, cols: [1, 3] as const };
export const STOCK_ROW_START = 18; // southern edge of the stock district, filling northward
export const STOCK_COLS = [2, 1, 3]; // center column first

export interface Block {
  row: number;
  col: number;
  x: number; // center
  z: number;
  park: boolean;
}

export interface Lot extends Company {
  x: number;
  z: number;
  style: TowerStyle;
}

export type TowerStyle = "setback" | "spire" | "deco" | "glass";
const STYLES: TowerStyle[] = ["setback", "spire", "deco", "glass"];

export function blockCenter(row: number, col: number) {
  return {
    x: -ISLAND_W / 2 + AVENUE + col * (BLOCK_W + AVENUE) + BLOCK_W / 2,
    z: -ISLAND_D / 2 + STREET + row * (BLOCK_D + STREET) + BLOCK_D / 2,
  };
}

export const isPark = (row: number, col: number) => row >= PARK.rows[0] && row <= PARK.rows[1] && col >= PARK.cols[0] && col <= PARK.cols[1];

export function blocks(): Block[] {
  const out: Block[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) out.push({ row, col, ...blockCenter(row, col), park: isPark(row, col) });
  return out;
}

/** Avenue center lines (x) and street center lines (z). */
export function avenueXs() {
  return Array.from({ length: COLS + 1 }, (_, i) => -ISLAND_W / 2 + AVENUE / 2 + i * (BLOCK_W + AVENUE));
}
export function streetZs() {
  return Array.from({ length: ROWS + 1 }, (_, i) => -ISLAND_D / 2 + STREET / 2 + i * (BLOCK_D + STREET));
}

/**
 * Each sector gets its own neighborhood: it starts on a fresh row of the stock district and
 * fills two towers per block, center column first. Bigger sectors claim the blocks nearest the harbor.
 */
export function planStocks(companies: Company[]) {
  const bySector = new Map<string, Company[]>();
  for (const c of companies) bySector.set(c.sector, [...(bySector.get(c.sector) ?? []), c]);
  const sectors = [...bySector.entries()].sort((a, b) => b[1].length - a[1].length);

  const lots: Lot[] = [];
  const used = new Set<string>();
  const hoods: { sector: string; x: number; z: number }[] = [];
  let row = STOCK_ROW_START;
  let i = 0;
  for (const [sector, list] of sectors) {
    let slot = 0;
    const first = blockCenter(row, STOCK_COLS[0]);
    hoods.push({ sector, x: first.x, z: first.z + BLOCK_D / 2 + STREET / 2 });
    for (const c of list) {
      const col = STOCK_COLS[Math.floor(slot / 2) % STOCK_COLS.length];
      const r = row - Math.floor(slot / (STOCK_COLS.length * 2));
      const b = blockCenter(r, col);
      used.add(`${r}:${col}`);
      lots.push({ ...c, x: b.x + (slot % 2 === 0 ? -2.1 : 2.1), z: b.z, style: STYLES[i++ % STYLES.length] });
      slot++;
    }
    row -= Math.ceil(list.length / (STOCK_COLS.length * 2));
  }
  const center = lots.length ? lots.reduce((a, l) => a + l.z, 0) / lots.length : 0;
  return { lots, used, hoods, center };
}

/** Deterministic pseudo-random numbers so the skyline is the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export interface Filler {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tint: number;
}

/** Background buildings on every block that isn't park or stock land. Short near stocks so the stocks read. */
export function planFillers(used: Set<string>): Filler[] {
  const rand = rng(20261121);
  const out: Filler[] = [];
  for (const b of blocks()) {
    if (b.park || used.has(`${b.row}:${b.col}`)) continue;
    const nearStocks = b.row >= STOCK_ROW_START - 7 && b.row <= STOCK_ROW_START + 1;
    const downtown = b.row > STOCK_ROW_START;
    const uptown = b.row < PARK.rows[0];
    const edge = b.col === 0 || b.col === COLS - 1;
    for (let gx = 0; gx < 4; gx++)
      for (let gz = 0; gz < 2; gz++) {
        if (rand() < 0.08) continue;
        const base = downtown ? 3.5 : nearStocks ? 1.2 : uptown ? 1.2 : 2;
        const span = downtown ? 6.5 : nearStocks ? (edge ? 2.8 : 2) : uptown ? 2.2 : 4.5;
        out.push({
          x: b.x - BLOCK_W / 2 + 1 + gx * 2,
          z: b.z - BLOCK_D / 4 + gz * (BLOCK_D / 2),
          w: 1.5 + rand() * 0.35,
          d: 1.7 + rand() * 0.3,
          h: base + Math.pow(rand(), 1.6) * span,
          tint: rand(),
        });
      }
  }
  // Low buildings across both rivers.
  for (const side of [-1, 1])
    for (let k = 0; k < 160; k++) {
      const x = side * (ISLAND_W / 2 + RIVER + 3 + rand() * 40);
      out.push({ x, z: -ISLAND_D / 2 + rand() * ISLAND_D, w: 1.6 + rand(), d: 1.6 + rand(), h: 0.8 + Math.pow(rand(), 2) * 3.5, tint: rand() });
    }
  return out;
}

/** Inside a building block (not park), with a margin, so walkers stay on streets and avenues. */
export function blocked(x: number, z: number, margin = 0.35) {
  if (Math.abs(x) > ISLAND_W / 2 - 0.3 || Math.abs(z) > ISLAND_D / 2 - 0.3) return true;
  const pitchX = BLOCK_W + AVENUE;
  const pitchZ = BLOCK_D + STREET;
  const lx = x + ISLAND_W / 2 - AVENUE;
  const lz = z + ISLAND_D / 2 - STREET;
  const col = Math.floor(lx / pitchX);
  const row = Math.floor(lz / pitchZ);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const ix = lx - col * pitchX;
  const iz = lz - row * pitchZ;
  if (ix < -margin || ix > BLOCK_W + margin || iz < -margin || iz > BLOCK_D + margin) return false;
  return !isPark(row, col);
}

/** Nearest point on a street or avenue, for dropping from the sky to walk. */
export function nearestStreet(x: number, z: number) {
  const ax = avenueXs().reduce((a, v) => (Math.abs(v - x) < Math.abs(a - x) ? v : a));
  const sz = streetZs().reduce((a, v) => (Math.abs(v - z) < Math.abs(a - z) ? v : a));
  const cx = Math.max(-ISLAND_W / 2 + 1, Math.min(ISLAND_W / 2 - 1, x));
  const cz = Math.max(-ISLAND_D / 2 + 1, Math.min(ISLAND_D / 2 - 1, z));
  return Math.abs(ax - x) < Math.abs(sz - z) ? { x: ax, z: cz, axis: "avenue" as const } : { x: cx, z: sz, axis: "street" as const };
}
