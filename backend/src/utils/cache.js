'use strict';

const AppError = require('../middlewares/appError');
let redisClient;
const memoryCache = new Map();
const DEFAULT_TTL_SECONDS = Number(process.env.DASHBOARD_CACHE_TTL || 30);

async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.warn('[cache] Redis client error:', err.message);
      redisClient = null;
    });
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return redisClient;
  } catch (error) {
    console.warn('[cache] Redis unavailable, falling back to in-memory cache');
    redisClient = null;
    return null;
  }
}

function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

async function getCache(key) {
  if (!key) {
    throw new AppError(500, 'Cache key is required');
  }

  const client = await getRedisClient();

  if (client) {
    try {
      const cached = await client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[cache] Redis get failed:', error.message);
      return null;
    }
  }

  cleanupMemoryCache();
  const entry = memoryCache.get(key);
  return entry ? entry.value : null;
}

async function setCache(key, value, ttl = DEFAULT_TTL_SECONDS) {
  if (!key) {
    throw new AppError(500, 'Cache key is required');
  }

  const client = await getRedisClient();
  const payload = JSON.stringify(value);

  if (client) {
    try {
      await client.setEx(key, ttl, payload);
      return;
    } catch (error) {
      console.warn('[cache] Redis set failed:', error.message);
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

async function clearCache(key) {
  if (!key) {
    return;
  }

  const client = await getRedisClient();

  if (client) {
    try {
      await client.del(key);
      return;
    } catch (error) {
      console.warn('[cache] Redis del failed:', error.message);
    }
  }

  memoryCache.delete(key);
}

module.exports = {
  getCache,
  setCache,
  clearCache,
};
