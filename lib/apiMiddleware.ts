import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabaseClient';
import { getUserSubscription, canUseFeature, trackFeatureUsage } from './subscriptionService';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  subscriptionId?: string;
}

/**
 * Middleware to verify user authentication from request
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Attach user ID to request
    const authenticatedReq = request as AuthenticatedRequest;
    authenticatedReq.userId = user.id;

    return handler(authenticatedReq);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Middleware to check if user has access to a specific feature
 */
export async function withFeatureAccess(
  request: AuthenticatedRequest,
  featureKey: string,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  if (!request.userId) {
    return NextResponse.json(
      { error: 'User not authenticated' },
      { status: 401 }
    );
  }

  try {
    const subscription = await getUserSubscription(request.userId);

    if (!subscription) {
      return NextResponse.json(
        {
          error: 'No active subscription found',
          upgradeRequired: true,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    const usageCheck = await canUseFeature(
      request.userId,
      subscription.id,
      featureKey
    );

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason || 'Feature not available in your plan',
          upgradeRequired: true,
          upgradeUrl: '/pricing',
          featureKey,
        },
        { status: 403 }
      );
    }

    // Attach subscription ID for usage tracking
    request.subscriptionId = subscription.id;

    return handler(request);
  } catch (error) {
    console.error('Feature access middleware error:', error);
    return NextResponse.json(
      { error: 'Failed to verify feature access' },
      { status: 500 }
    );
  }
}

/**
 * Middleware to track feature usage after successful request
 */
export async function trackUsage(
  subscriptionId: string,
  featureKey: string,
  increment: number = 1
): Promise<void> {
  try {
    await trackFeatureUsage(subscriptionId, featureKey, increment);
  } catch (error) {
    console.error('Usage tracking error:', error);
    // Don't fail the request if tracking fails
  }
}

/**
 * Combined middleware for auth + feature access check
 */
export async function withAuthAndFeature(
  request: NextRequest,
  featureKey: string,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (authReq) => {
    return withFeatureAccess(authReq, featureKey, handler);
  });
}

/**
 * Helper to extract user ID from request body
 */
export async function getUserIdFromBody(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json();
    return body.userId || body.elderId || body.user_id || null;
  } catch {
    return null;
  }
}

/**
 * Middleware to verify organization access
 */
export async function withOrganizationAccess(
  request: AuthenticatedRequest,
  handler: (req: AuthenticatedRequest, orgId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  if (!request.userId) {
    return NextResponse.json(
      { error: 'User not authenticated' },
      { status: 401 }
    );
  }

  try {
    const { data: orgUser, error } = await supabase
      .from('organization_users')
      .select('organization_id, role, permissions')
      .eq('user_id', request.userId)
      .maybeSingle();

    if (error || !orgUser) {
      return NextResponse.json(
        { error: 'Not a member of any organization' },
        { status: 403 }
      );
    }

    return handler(request, orgUser.organization_id);
  } catch (error) {
    console.error('Organization access middleware error:', error);
    return NextResponse.json(
      { error: 'Failed to verify organization access' },
      { status: 500 }
    );
  }
}

/**
 * Middleware to verify Grace Notes practitioner access
 */
export async function withPractitionerAccess(
  request: AuthenticatedRequest,
  handler: (req: AuthenticatedRequest, practitionerId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  if (!request.userId) {
    return NextResponse.json(
      { error: 'User not authenticated' },
      { status: 401 }
    );
  }

  try {
    const { data: practitioner, error } = await supabase
      .from('grace_notes_practitioners')
      .select('id, subscription_plan')
      .eq('user_id', request.userId)
      .maybeSingle();

    if (error || !practitioner) {
      return NextResponse.json(
        { error: 'Not registered as a Grace Notes practitioner' },
        { status: 403 }
      );
    }

    return handler(request, practitioner.id);
  } catch (error) {
    console.error('Practitioner access middleware error:', error);
    return NextResponse.json(
      { error: 'Failed to verify practitioner access' },
      { status: 500 }
    );
  }
}

/**
 * Rate limiting based on subscription tier
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  userId: string,
  featureKey: string,
  tier: string
): Promise<{ allowed: boolean; resetIn?: number }> {
  const limits: Record<string, number> = {
    free: 10, // 10 requests per minute
    essential: 30,
    plus: 60,
    premium: 120,
  };

  const limit = limits[tier.toLowerCase()] || limits.free;
  const key = `${userId}:${featureKey}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      resetIn: Math.ceil((current.resetTime - now) / 1000),
    };
  }

  current.count++;
  return { allowed: true };
}
