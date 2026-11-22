import "server-only";
import { Redis } from "@upstash/redis";
import { standingFrom, type Standing } from "./standings";

/** Everyone's scores, in the free Upstash Redis database connected through Vercel. */
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const DAILY_KEEP = 60 * 60 * 24 * 10;
// Versioned with the puzzle picker, so a change to how puzzles are chosen starts a fresh comparison.
export const dailyKey = (day: string) => `daily:v3:${day}:scores`;
export const eraKey = (era: string) => `era:${era}:best`;

/**
 * Save a score. "first" keeps a player's first score (the daily game); "best" keeps their best (era rounds).
 * Returns the score now stored for this player, or null when there is no database.
 */
export async function saveScore(key: string, clientId: string, ret: number, mode: "first" | "best", ttl?: number) {
  if (!redis) return null;
  if (mode === "first") await redis.zadd(key, { nx: true }, { score: ret, member: clientId });
  else await redis.zadd(key, { gt: true }, { score: ret, member: clientId });
  if (ttl) await redis.expire(key, ttl);
  const stored = await redis.zscore(key, clientId);
  return stored == null ? ret : Number(stored);
}

/** Every other player's score for a key (capped, which is plenty for a percentile). */
async function others(key: string, clientId: string) {
  if (!redis) return null;
  const flat = await redis.zrange<(string | number)[]>(key, 0, 19999, { withScores: true });
  const out: number[] = [];
  for (let i = 0; i < flat.length; i += 2) if (String(flat[i]) !== clientId) out.push(Number(flat[i + 1]));
  return out;
}

export async function standing(key: string, clientId: string, you: number, simulated?: number[]): Promise<Standing | null> {
  const rest = await others(key, clientId);
  if (rest) return standingFrom(you, rest, simulated);
  return simulated ? standingFrom(you, [], simulated) : null;
}

export async function storedScore(key: string, clientId: string) {
  if (!redis) return null;
  const s = await redis.zscore(key, clientId);
  return s == null ? null : Number(s);
}

export const DAILY_TTL = DAILY_KEEP;
export const validClient = (id: unknown) => typeof id === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(id);
