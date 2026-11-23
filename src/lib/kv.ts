import "server-only";
import { Redis } from "@upstash/redis";

/** The free Upstash Redis database connected through Vercel (null when not configured, e.g. locally). */
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;

/**
 * Compute a value once and freeze it in the database, so every server uses exactly the same copy.
 * Price sources can differ by a hair between fetches; scoring needs the identical numbers the player saw.
 */
export async function frozen<T>(key: string, compute: () => Promise<T>, ttlSeconds?: number): Promise<T> {
  if (!redis) return compute();
  try {
    const hit = await redis.get<T>(key);
    if (hit != null) return hit;
  } catch (e) {
    console.error("kv read", key, e);
    return compute();
  }
  const value = await compute();
  try {
    // First writer wins; read back so a server that lost the race uses the winner's copy.
    await redis.set(key, value, ttlSeconds ? { nx: true, ex: ttlSeconds } : { nx: true });
    return (await redis.get<T>(key)) ?? value;
  } catch (e) {
    console.error("kv write", key, e);
    return value;
  }
}
