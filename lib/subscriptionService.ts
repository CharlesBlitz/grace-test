import { supabase } from './supabaseClient';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  is_featured: boolean;
  max_users: number | null;
  max_residents: number | null;
}

export interface SubscriptionFeature {
  feature_key: string;
  feature_name: string;
  feature_limit: number | null;
  is_unlimited: boolean;
}

export interface UserSubscription {
  id: string;
  plan_slug: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  features: SubscriptionFeature[];
}

export async function getActivePlans(planType: 'individual' | 'family' | 'organization' = 'individual') {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .eq('plan_type', planType)
    .order('display_order');

  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }

  return data as SubscriptionPlan[];
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase.rpc('get_user_subscription_features', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const features: SubscriptionFeature[] = data.map((row: any) => ({
    feature_key: row.feature_key,
    feature_name: row.feature_key,
    feature_limit: row.feature_limit,
    is_unlimited: row.is_unlimited,
  }));

  return {
    id: data[0].subscription_id,
    plan_slug: data[0].plan_slug,
    plan_name: data[0].plan_name,
    status: data[0].status,
    current_period_end: null,
    trial_ends_at: null,
    features,
  };
}

export async function createFreeSubscription(userId: string) {
  const { data: freePlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('slug', 'free')
    .eq('plan_type', 'individual')
    .single();

  if (!freePlan) {
    throw new Error('Free plan not found');
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating free subscription:', error);
    throw error;
  }

  return data;
}

export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_feature', {
    p_user_id: userId,
    p_feature_key: featureKey,
  });

  if (error) {
    console.error('Error checking feature access:', error);
    return false;
  }

  return data === true;
}

export async function getFeatureLimit(userId: string, featureKey: string): Promise<number | null> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return null;
  }

  const feature = subscription.features.find((f) => f.feature_key === featureKey);

  if (!feature) {
    return null;
  }

  if (feature.is_unlimited) {
    return -1;
  }

  return feature.feature_limit;
}

export async function trackFeatureUsage(
  subscriptionId: string,
  featureKey: string,
  increment: number = 1
) {
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: existing } = await supabase
    .from('subscription_usage')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('feature_key', featureKey)
    .gte('period_start', periodStart.toISOString())
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('subscription_usage')
      .update({
        usage_count: existing.usage_count + increment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating usage:', error);
    }
  } else {
    const { error } = await supabase.from('subscription_usage').insert({
      subscription_id: subscriptionId,
      feature_key: featureKey,
      usage_count: increment,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });

    if (error) {
      console.error('Error creating usage record:', error);
    }
  }
}

export async function getCurrentUsage(subscriptionId: string, featureKey: string): Promise<number> {
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('subscription_usage')
    .select('usage_count')
    .eq('subscription_id', subscriptionId)
    .eq('feature_key', featureKey)
    .gte('period_start', periodStart.toISOString())
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  return data.usage_count;
}

export async function canUseFeature(
  userId: string,
  subscriptionId: string,
  featureKey: string
): Promise<{ allowed: boolean; reason?: string }> {
  const hasAccess = await hasFeature(userId, featureKey);

  if (!hasAccess) {
    return { allowed: false, reason: 'Feature not available in your plan' };
  }

  const limit = await getFeatureLimit(userId, featureKey);

  if (limit === null) {
    return { allowed: false, reason: 'Feature not found' };
  }

  if (limit === -1) {
    return { allowed: true };
  }

  const currentUsage = await getCurrentUsage(subscriptionId, featureKey);

  if (currentUsage >= limit) {
    return { allowed: false, reason: 'Monthly limit reached' };
  }

  return { allowed: true };
}

export const PLAN_FEATURES = {
  free: {
    conversations: 10,
    reminders: 5,
    familyMembers: 1,
    voiceCloning: 0,
  },
  essential: {
    conversations: -1,
    reminders: -1,
    familyMembers: 3,
    voiceCloning: 1,
    photoStorage: 100,
  },
  plus: {
    conversations: -1,
    reminders: -1,
    familyMembers: 5,
    voiceCloning: 3,
    photoStorage: -1,
    documentStorageGB: 5,
  },
  premium: {
    conversations: -1,
    reminders: -1,
    familyMembers: -1,
    voiceCloning: -1,
    photoStorage: -1,
    documentStorageGB: -1,
  },
};
