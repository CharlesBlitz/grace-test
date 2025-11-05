/**
 * System Monitoring Service
 *
 * Monitors application health, performance, and critical services.
 * Provides real-time health checks and alerting capabilities.
 */

import { supabase } from './supabaseClient';
import { errorTracker } from './errorTracking';
import { checkRedisHealth } from './redisClient';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  message?: string;
  timestamp: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  checks: HealthCheck[];
  uptime: number;
  lastCheck: string;
}

class MonitoringService {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    // Run initial check
    this.performHealthChecks();

    // Schedule regular checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform all health checks
   */
  async performHealthChecks(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];

    // Check database
    checks.push(await this.checkDatabase());

    // Check Stripe
    checks.push(await this.checkStripe());

    // Check email service
    checks.push(await this.checkEmailService());

    // Check OpenAI
    checks.push(await this.checkOpenAI());

    // Check Redis
    checks.push(await this.checkRedis());

    // Determine overall health
    const hasDown = checks.some((c) => c.status === 'down');
    const hasDegraded = checks.some((c) => c.status === 'degraded');
    const overall = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

    const systemHealth: SystemHealth = {
      overall,
      checks,
      uptime: this.getUptime(),
      lastCheck: new Date().toISOString(),
    };

    // Store health check results
    await this.storeHealthChecks(checks);

    // Alert on critical issues
    if (overall === 'down') {
      await errorTracker.logError(
        'System health check failed: One or more critical services are down',
        'critical',
        { checks }
      );
    }

    return systemHealth;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const { error } = await supabase.from('users').select('id').limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          service: 'database',
          status: 'down',
          responseTime,
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        service: 'database',
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        service: 'database',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Stripe API
   */
  private async checkStripe(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Check if running on server (process.env available)
      if (typeof window !== 'undefined') {
        // Client-side: Return healthy status (actual check happens server-side)
        return {
          service: 'stripe',
          status: 'healthy',
          responseTime: Date.now() - startTime,
          message: 'Client-side check',
          timestamp: new Date().toISOString(),
        };
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeKey) {
        return {
          service: 'stripe',
          status: 'down',
          message: 'Stripe key not configured',
          timestamp: new Date().toISOString(),
        };
      }

      // Simple check - verify key format
      const isValid = stripeKey.startsWith('sk_');
      const responseTime = Date.now() - startTime;

      return {
        service: 'stripe',
        status: isValid ? 'healthy' : 'down',
        responseTime,
        message: isValid ? undefined : 'Invalid Stripe key format',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        service: 'stripe',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check email service (Resend)
   */
  private async checkEmailService(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Check if running on server (process.env available)
      if (typeof window !== 'undefined') {
        // Client-side: Return healthy status (actual check happens server-side)
        return {
          service: 'email',
          status: 'healthy',
          responseTime: Date.now() - startTime,
          message: 'Client-side check',
          timestamp: new Date().toISOString(),
        };
      }

      const resendKey = process.env.RESEND_API_KEY;

      if (!resendKey) {
        return {
          service: 'email',
          status: 'down',
          message: 'Resend API key not configured',
          timestamp: new Date().toISOString(),
        };
      }

      // Verify key format
      const isValid = resendKey.startsWith('re_');
      const responseTime = Date.now() - startTime;

      return {
        service: 'email',
        status: isValid ? 'healthy' : 'down',
        responseTime,
        message: isValid ? undefined : 'Invalid Resend key format',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        service: 'email',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check OpenAI API
   */
  private async checkOpenAI(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Check if running on server (process.env available)
      if (typeof window !== 'undefined') {
        // Client-side: Return healthy status (actual check happens server-side)
        return {
          service: 'openai',
          status: 'healthy',
          responseTime: Date.now() - startTime,
          message: 'Client-side check',
          timestamp: new Date().toISOString(),
        };
      }

      const openaiKey = process.env.OPENAI_API_KEY;

      if (!openaiKey) {
        return {
          service: 'openai',
          status: 'down',
          message: 'OpenAI API key not configured',
          timestamp: new Date().toISOString(),
        };
      }

      // Verify key format
      const isValid = openaiKey.startsWith('sk-');
      const responseTime = Date.now() - startTime;

      return {
        service: 'openai',
        status: isValid ? 'healthy' : 'down',
        responseTime,
        message: isValid ? undefined : 'Invalid OpenAI key format',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        service: 'openai',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const health = await checkRedisHealth();
      const responseTime = Date.now() - startTime;

      if (!health.healthy) {
        return {
          service: 'redis',
          status: 'down',
          responseTime,
          message: health.error || 'Redis not available (using in-memory fallback)',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        service: 'redis',
        status: health.latency && health.latency > 1000 ? 'degraded' : 'healthy',
        responseTime: health.latency || responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        service: 'redis',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Store health check results in database
   */
  private async storeHealthChecks(checks: HealthCheck[]): Promise<void> {
    try {
      for (const check of checks) {
        await supabase.rpc('record_health_check', {
          p_check_type: check.service,
          p_status: check.status,
          p_response_time_ms: check.responseTime || null,
          p_error_message: check.message || null,
        });
      }
    } catch (err) {
      console.error('Failed to store health checks:', err);
    }
  }

  /**
   * Get system uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get recent health check history
   */
  async getHealthHistory(hours: number = 24): Promise<HealthCheck[]> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from('system_health_checks')
        .select('*')
        .gte('checked_at', since.toISOString())
        .order('checked_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map((check) => ({
        service: check.check_type,
        status: check.status as 'healthy' | 'degraded' | 'down',
        responseTime: check.response_time_ms || undefined,
        message: check.error_message || undefined,
        timestamp: check.checked_at,
      }));
    } catch (err) {
      console.error('Failed to get health history:', err);
      return [];
    }
  }

  /**
   * Get service availability percentage
   */
  async getServiceAvailability(
    service: string,
    hours: number = 24
  ): Promise<{ availability: number; totalChecks: number; healthyChecks: number }> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from('system_health_checks')
        .select('status')
        .eq('check_type', service)
        .gte('checked_at', since.toISOString());

      if (error || !data || data.length === 0) {
        return { availability: 0, totalChecks: 0, healthyChecks: 0 };
      }

      const totalChecks = data.length;
      const healthyChecks = data.filter((c) => c.status === 'healthy').length;
      const availability = (healthyChecks / totalChecks) * 100;

      return { availability, totalChecks, healthyChecks };
    } catch (err) {
      console.error('Failed to get service availability:', err);
      return { availability: 0, totalChecks: 0, healthyChecks: 0 };
    }
  }
}

// Global monitoring service instance
export const monitoringService = new MonitoringService();

// Helper function to get current system health
export async function getSystemHealth(): Promise<SystemHealth> {
  return monitoringService.performHealthChecks();
}

// Helper function to check if system is operational
export async function isSystemOperational(): Promise<boolean> {
  const health = await getSystemHealth();
  return health.overall !== 'down';
}
