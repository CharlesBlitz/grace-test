/**
 * Redis-Based Rate Limiter
 *
 * Production-grade distributed rate limiting using Redis for consistency
 * across multiple server instances. Falls back to in-memory limiting if
 * Redis is unavailable.
 */

import { getRedisClient, redisManager } from './redisClient';
import { globalRateLimiter } from './rateLimiter';
import type { Redis } from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  usingRedis?: boolean;
}

/**
 * Redis-based rate limiter with automatic fallback to in-memory
 */
class RedisRateLimiter {
  private redis: Redis | null = null;
  private initPromise: Promise<void> | null = null;
  private initialized: boolean = false;

  /**
   * Initialize Redis connection (lazy loading)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.redis = await getRedisClient();
        this.initialized = true;

        if (this.redis) {
          console.log('[RedisRateLimiter] Using Redis for distributed rate limiting');
        } else {
          console.log('[RedisRateLimiter] Using in-memory rate limiting (Redis not available)');
        }
      } catch (error) {
        console.error('[RedisRateLimiter] Initialization error:', error);
        this.redis = null;
        this.initialized = true;
      }
    })();

    return this.initPromise;
  }

  /**
   * Check rate limit using Redis (sliding window algorithm)
   */
  private async checkLimitRedis(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error('Redis not available');
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `ratelimit:${identifier}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      // Get count after removing old entries (index 1 in results)
      const count = results[1]?.[1] as number;

      // Calculate reset time (end of current window)
      const resetTime = now + config.windowMs;

      // Check if limit exceeded
      if (count >= config.maxRequests) {
        // Remove the request we just added since we're rejecting it
        await this.redis.zrem(key, `${now}-${Math.random()}`);

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          usingRedis: true,
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - count - 1,
        resetTime,
        usingRedis: true,
      };
    } catch (error) {
      console.error('[RedisRateLimiter] Redis operation failed:', error);
      throw error;
    }
  }

  /**
   * Check rate limit with automatic Redis/in-memory fallback
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Ensure initialized
    await this.initialize();

    // Try Redis first if available
    if (this.redis && redisManager.isRedisConnected()) {
      try {
        return await this.checkLimitRedis(identifier, config);
      } catch (error) {
        console.error('[RedisRateLimiter] Redis check failed, falling back to in-memory:', error);
        // Fall through to in-memory fallback
      }
    }

    // Fallback to in-memory rate limiter
    const result = await globalRateLimiter.checkLimit(identifier, config);
    return {
      ...result,
      usingRedis: false,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async reset(identifier: string): Promise<void> {
    await this.initialize();

    if (this.redis && redisManager.isRedisConnected()) {
      try {
        const key = `ratelimit:${identifier}`;
        await this.redis.del(key);
      } catch (error) {
        console.error('[RedisRateLimiter] Failed to reset Redis key:', error);
      }
    }

    // Also clear from in-memory store
    globalRateLimiter.clear();
  }

  /**
   * Get current request count for an identifier
   */
  async getCount(identifier: string): Promise<number> {
    await this.initialize();

    if (this.redis && redisManager.isRedisConnected()) {
      try {
        const key = `ratelimit:${identifier}`;
        return await this.redis.zcard(key);
      } catch (error) {
        console.error('[RedisRateLimiter] Failed to get count from Redis:', error);
      }
    }

    return 0;
  }

  /**
   * Get statistics about rate limiting
   */
  async getStats(): Promise<{
    usingRedis: boolean;
    redisHealthy: boolean;
    redisLatency?: number;
  }> {
    await this.initialize();

    const health = await redisManager.healthCheck();

    return {
      usingRedis: this.redis !== null && redisManager.isRedisConnected(),
      redisHealthy: health.healthy,
      redisLatency: health.latency,
    };
  }
}

// Global Redis rate limiter instance
export const redisRateLimiter = new RedisRateLimiter();

// Rate limit configurations (imported from original rateLimiter)
export const RATE_LIMIT_CONFIGS = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  payment: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },
  messaging: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
  },
} as const;

/**
 * Main rate limit function with Redis support
 */
export async function rateLimit(
  identifier: string,
  configKey: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): Promise<{
  success: boolean;
  remaining?: number;
  resetTime?: number;
  error?: string;
  usingRedis?: boolean;
}> {
  const config = RATE_LIMIT_CONFIGS[configKey];

  try {
    const result = await redisRateLimiter.checkLimit(identifier, config);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      return {
        success: false,
        remaining: 0,
        resetTime: result.resetTime,
        error: `Rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}`,
        usingRedis: result.usingRedis,
      };
    }

    return {
      success: true,
      remaining: result.remaining,
      resetTime: result.resetTime,
      usingRedis: result.usingRedis,
    };
  } catch (error) {
    console.error('[RedisRateLimiter] Rate limit error:', error);
    // Fail open - allow request if rate limiter has issues
    return { success: true, usingRedis: false };
  }
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const netlifyIp = req.headers.get('x-nf-client-connection-ip');

  const ip =
    cfConnectingIp ||
    netlifyIp ||
    realIp ||
    forwarded?.split(',')[0]?.trim() ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(
  resetTime: number,
  usingRedis: boolean = false
): Response {
  const headers = {
    'Content-Type': 'application/json',
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
    'X-RateLimit-Backend': usingRedis ? 'redis' : 'memory',
  };

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      resetTime: new Date(resetTime).toISOString(),
    }),
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Middleware wrapper for easy API route integration
 */
export async function withRateLimit(
  req: Request,
  configKey: keyof typeof RATE_LIMIT_CONFIGS,
  userId?: string
) {
  const identifier = getIdentifier(req, userId);
  const result = await rateLimit(identifier, configKey);

  if (!result.success) {
    return {
      allowed: false,
      response: createRateLimitResponse(result.resetTime!, result.usingRedis),
    };
  }

  return {
    allowed: true,
    remaining: result.remaining,
    resetTime: result.resetTime,
    usingRedis: result.usingRedis,
  };
}
