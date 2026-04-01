import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

const PREFIX = "weeeeki";

export const KEYS = {
  booksSorted: `${PREFIX}:books`,
  book: (id: string) => `${PREFIX}:book:${id}`,
  featured: `${PREFIX}:featured`,
} as const;
