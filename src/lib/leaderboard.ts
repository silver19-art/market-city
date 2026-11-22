import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Daily leaderboard in a free Upstash Redis database (added through Vercel's Storage tab).
 * Works with either the Vercel KV-style or Upstash-style environment variable names.
 */
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;

const KEEP_SECONDS = 60 * 60 * 24 * 10;
const scoresKey = (day: string) => `daily:${day}:scores`;
const namesKey = (day: string) => `daily:${day}:players`;

export interface Entry {
  rank: number;
  name: string;
  ret: number;
  guessed: boolean;
  you?: boolean;
}

interface Player {
  name: string;
  ret: number;
  guessed: boolean;
}

/** Save a player's first score of the day. Later submissions from the same browser keep the original. */
export async function saveScore(day: string, clientId: string, p: Player) {
  if (!redis) return { saved: false, existing: false };
  const added = await redis.zadd(scoresKey(day), { nx: true }, { score: p.ret, member: clientId });
  if (added) {
    await redis.hset(namesKey(day), { [clientId]: JSON.stringify(p) });
    await Promise.all([redis.expire(scoresKey(day), KEEP_SECONDS), redis.expire(namesKey(day), KEEP_SECONDS)]);
  }
  return { saved: true, existing: !added };
}

export async function leaderboard(day: string, clientId?: string, top = 20) {
  if (!redis) return { enabled: false, entries: [] as Entry[], total: 0, you: null as Entry | null };
  const [ids, total] = await Promise.all([redis.zrange<string[]>(scoresKey(day), 0, top - 1, { rev: true }), redis.zcard(scoresKey(day))]);
  const youRank = clientId ? await redis.zrevrank(scoresKey(day), clientId) : null;
  const want = [...ids, ...(clientId && youRank != null && youRank >= top ? [clientId] : [])];
  const raw = want.length ? await redis.hmget<Record<string, Player | string>>(namesKey(day), ...want) : null;
  const read = (id: string): Player | null => {
    const v = raw?.[id];
    if (!v) return null;
    return typeof v === "string" ? (JSON.parse(v) as Player) : v;
  };
  const entries: Entry[] = ids.flatMap((id, i) => {
    const p = read(id);
    return p ? [{ rank: i + 1, name: p.name, ret: p.ret, guessed: p.guessed, you: id === clientId }] : [];
  });
  const mine = clientId && youRank != null ? read(clientId) : null;
  const you = mine ? { rank: youRank! + 1, name: mine.name, ret: mine.ret, guessed: mine.guessed, you: true } : null;
  return { enabled: true, entries, total, you };
}

/** Light clean-up for public nicknames. */
export function cleanName(raw: unknown) {
  const name = String(raw ?? "")
    .replace(/[^\p{L}\p{N} ._'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  const blocked = /(fuck|shit|bitch|cunt|nigg|fag|rape|nazi|whore|slut|dick|cock|pussy)/i;
  if (!name || blocked.test(name.replace(/[^a-z]/gi, ""))) return null;
  return name;
}
