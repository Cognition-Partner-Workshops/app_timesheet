import Redis from 'ioredis';
import { config } from './index';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    const r = getRedis();
    await r.connect();
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis connection failed, caching disabled:', (err as Error).message);
  }
}

export async function getCached(key: string): Promise<string | null> {
  try {
    const r = getRedis();
    if (r.status === 'ready') {
      return await r.get(key);
    }
  } catch {
    // Cache miss on error
  }
  return null;
}

export async function setCache(key: string, value: string, ttl: number = config.cacheTtl): Promise<void> {
  try {
    const r = getRedis();
    if (r.status === 'ready') {
      await r.setex(key, ttl, value);
    }
  } catch {
    // Silently fail cache writes
  }
}

export async function invalidateCache(pattern: string = 'stock:*'): Promise<void> {
  try {
    const r = getRedis();
    if (r.status === 'ready') {
      const keys = await r.keys(pattern);
      if (keys.length > 0) {
        await r.del(...keys);
      }
    }
  } catch {
    // Silently fail cache invalidation
  }
}
