/**
 * Rate Limiting Service
 *
 * Implements rate limiting for API routes to prevent abuse and ensure fair usage.
 * Uses in-memory store for simplicity, but can be extended to use Redis for production.
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired records every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const record = this.store.get(identifier);

    // If no record or expired, create new
    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      this.store.set(identifier, newRecord);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.resetTime,
      };
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // Increment count
    record.count += 1;
    this.store.set(identifier, record);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * Clean up expired records
   */
  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    this.store.forEach((record, key) => {
      if (now > record.resetTime) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.store.delete(key));
  }

  /**
   * Clear all rate limit records (useful for testing)
   */
  clear() {
    this.store.clear();
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter();

// Rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },

  // AI/Voice endpoints (more expensive)
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  // Payment endpoints
  payment: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },

  // Email/SMS endpoints
  messaging: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  // Strict limits for sensitive operations
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
  },
} as const;

/**
 * Rate limit middleware for Next.js API routes
 */
export async function rateLimit(
  identifier: string,
  configKey: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): Promise<{ success: boolean; remaining?: number; resetTime?: number; error?: string }> {
  const config = RATE_LIMIT_CONFIGS[configKey];

  try {
    const result = await globalRateLimiter.checkLimit(identifier, config);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      return {
        success: false,
        remaining: 0,
        resetTime: result.resetTime,
        error: `Rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}`,
      };
    }

    return {
      success: true,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if rate limiter has issues
    return { success: true };
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

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';

  return `ip:${ip}`;
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetTime: number): Response {
  const headers = {
    'Content-Type': 'application/json',
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
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

// Export the global instance for testing
export { globalRateLimiter };
