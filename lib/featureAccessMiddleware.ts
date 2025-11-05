import { supabase } from './supabaseClient';
import { getUserSubscription, canUseFeature, trackFeatureUsage, getFeatureLimit, getCurrentUsage } from './subscriptionService';

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  currentUsage?: number;
}

export async function checkFeatureAccess(
  userId: string,
  featureKey: string,
  options: {
    increment?: boolean;
    requireActive?: boolean;
  } = {}
): Promise<FeatureAccessResult> {
  const { increment = false, requireActive = true } = options;

  try {
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No active subscription found. Please upgrade your plan.',
      };
    }

    if (requireActive && subscription.status === 'expired') {
      return {
        allowed: false,
        reason: 'Your subscription has expired. Please renew to continue.',
      };
    }

    if (requireActive && subscription.status === 'cancelled') {
      return {
        allowed: false,
        reason: 'Your subscription has been cancelled. Please reactivate to continue.',
      };
    }

    if (subscription.status === 'suspended') {
      return {
        allowed: false,
        reason: 'Your subscription is suspended. Please contact support.',
      };
    }

    const accessCheck = await canUseFeature(userId, subscription.id, featureKey);

    if (!accessCheck.allowed) {
      return {
        allowed: false,
        reason: accessCheck.reason || 'Feature not available in your plan',
      };
    }

    const limit = await getFeatureLimit(userId, featureKey);

    // Handle null limit (feature not found or not configured)
    if (limit === null) {
      return {
        allowed: false,
        reason: 'Feature not available in your plan',
      };
    }

    const currentUsage = limit !== -1 ? await getCurrentUsage(subscription.id, featureKey) : 0;

    if (increment && limit !== -1 && currentUsage >= limit) {
      return {
        allowed: false,
        reason: 'Monthly usage limit reached. Please upgrade your plan for more.',
        limit,
        currentUsage,
        remaining: 0,
      };
    }

    if (increment) {
      await trackFeatureUsage(subscription.id, featureKey, 1);
    }

    const remaining = limit === -1 ? -1 : Math.max(0, limit - currentUsage - (increment ? 1 : 0));

    return {
      allowed: true,
      remaining,
      limit,
      currentUsage: currentUsage + (increment ? 1 : 0),
    };
  } catch (error) {
    console.error('Feature access check error:', error);
    return {
      allowed: false,
      reason: 'An error occurred checking your subscription. Please try again.',
    };
  }
}

export async function requireFeatureAccess(
  userId: string,
  featureKey: string,
  increment: boolean = false
): Promise<FeatureAccessResult> {
  const result = await checkFeatureAccess(userId, featureKey, { increment });

  if (!result.allowed) {
    throw new FeatureAccessError(result.reason || 'Access denied', result);
  }

  return result;
}

export class FeatureAccessError extends Error {
  public result: FeatureAccessResult;

  constructor(message: string, result: FeatureAccessResult) {
    super(message);
    this.name = 'FeatureAccessError';
    this.result = result;
  }
}

export async function getFeatureUsageInfo(
  userId: string,
  featureKey: string
): Promise<{
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return { limit: 0, used: 0, remaining: 0, percentage: 0 };
  }

  const limit = await getFeatureLimit(userId, featureKey);

  // Handle null limit (feature not found or not configured)
  if (limit === null) {
    return { limit: 0, used: 0, remaining: 0, percentage: 0 };
  }

  const used = limit !== -1 ? await getCurrentUsage(subscription.id, featureKey) : 0;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);

  return { limit, used, remaining, percentage };
}

export const FEATURE_KEYS = {
  VOICE_CONVERSATIONS: 'voice_conversations',
  VOICE_CLONING: 'voice_cloning',
  VOICE_CLONING_COUNT: 'voice_cloning_count',
  REMINDERS: 'reminders',
  REMINDER_SMS: 'reminder_sms',
  REMINDER_CALLS: 'reminder_calls',
  ESCALATION_ALERTS: 'escalation_alerts',
  FAMILY_MEMBERS: 'family_members',
  REAL_TIME_NOTIFICATIONS: 'real_time_notifications',
  MEDICATION_REPORTS: 'medication_reports',
  PHOTO_STORAGE: 'photo_storage',
  DOCUMENT_STORAGE_GB: 'document_storage_gb',
  VOICE_MESSAGES: 'voice_messages',
  WELLNESS_INSIGHTS: 'wellness_insights',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  ELECTRONIC_SIGNATURES: 'electronic_signatures',
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];
