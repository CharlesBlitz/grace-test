/**
 * Redis Client Configuration
 *
 * Provides Redis connection with automatic failover and connection pooling
 * for distributed rate limiting and caching across multiple server instances.
 */

import Redis, { RedisOptions } from 'ioredis';

interface RedisClientConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | void;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
}

class RedisClientManager {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<Redis | null> {
    // If already connected, return existing client
    if (this.client && this.isConnected) {
      return this.client;
    }

    // Check if Redis is configured
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;

    // If no Redis configuration, return null (will fall back to in-memory)
    if (!redisUrl && !redisHost) {
      console.log('[Redis] No Redis configuration found, using in-memory rate limiting');
      return null;
    }

    try {
      const config: RedisClientConfig = {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > this.maxConnectionAttempts) {
            console.error('[Redis] Maximum retry attempts reached');
            return undefined;
          }
          // Exponential backoff: 2^times * 100ms
          const delay = Math.min(Math.pow(2, times) * 100, 3000);
          console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
          return delay;
        },
      };

      // Parse Redis URL if provided
      if (redisUrl) {
        this.client = new Redis(redisUrl, config);
      } else if (redisHost) {
        this.client = new Redis({
          host: redisHost,
          port: redisPort ? parseInt(redisPort) : 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
          ...config,
        });
      }

      if (!this.client) {
        return null;
      }

      // Set up event handlers
      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('error', (error) => {
        console.error('[Redis] Connection error:', error.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('[Redis] Connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.connectionAttempts++;
        console.log(`[Redis] Reconnecting (attempt ${this.connectionAttempts})`);
      });

      // Attempt to connect
      await this.client.connect();

      // Test connection
      await this.client.ping();
      console.log('[Redis] Connection test successful');

      return this.client;
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      this.isConnected = false;

      // Clean up failed client
      if (this.client) {
        await this.client.quit().catch(() => {});
        this.client = null;
      }

      return null;
    }
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('[Redis] Disconnected successfully');
      } catch (error) {
        console.error('[Redis] Error disconnecting:', error);
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    if (!this.client || !this.isConnected) {
      return { healthy: false, error: 'Redis not connected' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Redis info for monitoring
   */
  async getInfo(): Promise<{ connected: boolean; info?: any; error?: string }> {
    if (!this.client || !this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info();
      return { connected: true, info };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Global Redis client manager
export const redisManager = new RedisClientManager();

// Helper function to get Redis client
export async function getRedisClient(): Promise<Redis | null> {
  return redisManager.connect();
}

// Helper function to check Redis health
export async function checkRedisHealth() {
  return redisManager.healthCheck();
}

// Export for testing and advanced usage
export { Redis };
