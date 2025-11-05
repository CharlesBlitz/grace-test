import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { checkRedisHealth } from '@/lib/redisClient';

export async function GET() {
  const checks: Record<string, any> = {};
  const startTime = Date.now();

  // Database check
  try {
    const dbStart = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.database = {
        status: 'down',
        latency: dbLatency,
        message: error.message,
      };
    } else {
      checks.database = {
        status: 'healthy',
        latency: dbLatency,
      };
    }
  } catch (error) {
    checks.database = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Stripe check
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      checks.stripe = {
        status: 'down',
        message: 'Stripe key not configured',
      };
    } else if (!stripeKey.startsWith('sk_')) {
      checks.stripe = {
        status: 'down',
        message: 'Invalid Stripe key format',
      };
    } else {
      checks.stripe = {
        status: 'healthy',
      };
    }
  } catch (error) {
    checks.stripe = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Email (Resend) check
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      checks.email = {
        status: 'down',
        message: 'Resend API key not configured',
      };
    } else if (!resendKey.startsWith('re_')) {
      checks.email = {
        status: 'down',
        message: 'Invalid Resend key format',
      };
    } else {
      checks.email = {
        status: 'healthy',
      };
    }
  } catch (error) {
    checks.email = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // OpenAI check
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      checks.openai = {
        status: 'down',
        message: 'OpenAI API key not configured',
      };
    } else if (!openaiKey.startsWith('sk-')) {
      checks.openai = {
        status: 'down',
        message: 'Invalid OpenAI key format',
      };
    } else {
      checks.openai = {
        status: 'healthy',
      };
    }
  } catch (error) {
    checks.openai = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Redis check (optional service - graceful degradation)
  try {
    const redisConfigured = process.env.REDIS_URL || process.env.REDIS_HOST;

    if (!redisConfigured) {
      // Redis not configured - this is acceptable, using in-memory fallback
      checks.redis = {
        status: 'healthy',
        mode: 'in-memory',
        message: 'Using in-memory rate limiting (Redis not configured)',
      };
    } else {
      const redis = await checkRedisHealth();
      checks.redis = {
        status: redis.healthy ? 'healthy' : 'down',
        mode: 'redis',
        latency: redis.latency,
        message: redis.error || (redis.healthy ? undefined : 'Redis not connected'),
      };
    }
  } catch (error) {
    checks.redis = {
      status: 'down',
      mode: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Overall health - only consider critical services (database, stripe, email, openai)
  // Redis is optional and can use in-memory fallback
  const criticalServices = ['database', 'stripe', 'email', 'openai'];
  const allCriticalHealthy = criticalServices.every(
    (service) => checks[service]?.status === 'healthy'
  );
  const status = allCriticalHealthy ? 200 : 503;
  const totalLatency = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allCriticalHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      latency: totalLatency,
      checks,
      version: process.env.npm_package_version || '1.0.0',
    },
    { status }
  );
}
