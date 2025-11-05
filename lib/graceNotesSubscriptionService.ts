import { supabase } from './supabaseClient';

export interface PractitionerSubscription {
  subscription_plan: string;
  max_clients: number;
  features: {
    feature_key: string;
    has_access: boolean;
  }[];
}

export interface ClientLimitCheck {
  allowed: boolean;
  current_count: number;
  max_allowed: number;
  reason: string;
}

/**
 * Get practitioner subscription with features
 */
export async function getPractitionerSubscription(
  practitionerId: string
): Promise<PractitionerSubscription | null> {
  try {
    const { data, error } = await supabase.rpc('get_practitioner_subscription', {
      p_practitioner_id: practitionerId,
    });

    if (error) {
      console.error('Error fetching practitioner subscription:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const features = data.map((row: any) => ({
      feature_key: row.feature_key,
      has_access: row.has_access,
    }));

    return {
      subscription_plan: data[0].subscription_plan,
      max_clients: data[0].max_clients,
      features,
    };
  } catch (error) {
    console.error('Error in getPractitionerSubscription:', error);
    return null;
  }
}

/**
 * Check if practitioner has access to a specific feature
 */
export async function checkPractitionerFeature(
  practitionerId: string,
  featureKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_grace_notes_plan_access', {
      p_practitioner_id: practitionerId,
      p_feature_key: featureKey,
    });

    if (error) {
      console.error('Error checking practitioner feature:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in checkPractitionerFeature:', error);
    return false;
  }
}

/**
 * Check if practitioner can add more clients
 */
export async function checkClientLimit(
  practitionerId: string
): Promise<ClientLimitCheck> {
  try {
    const { data, error } = await supabase.rpc('enforce_client_limits', {
      p_practitioner_id: practitionerId,
    });

    if (error) {
      console.error('Error checking client limit:', error);
      return {
        allowed: false,
        current_count: 0,
        max_allowed: 0,
        reason: 'Failed to check client limit',
      };
    }

    if (data && data.length > 0) {
      return {
        allowed: data[0].allowed,
        current_count: parseInt(data[0].current_count),
        max_allowed: data[0].max_allowed,
        reason: data[0].reason,
      };
    }

    return {
      allowed: false,
      current_count: 0,
      max_allowed: 0,
      reason: 'No subscription found',
    };
  } catch (error) {
    console.error('Error in checkClientLimit:', error);
    return {
      allowed: false,
      current_count: 0,
      max_allowed: 0,
      reason: 'Error checking limit',
    };
  }
}

/**
 * Grace Notes plan feature mappings
 */
export const GRACE_NOTES_PLAN_FEATURES = {
  solo: {
    max_clients: 20,
    features: [
      'basic_documentation',
      'mobile_capture',
      'gps_verification',
      'photo_documentation',
      'offline_mode',
      'client_management',
      'task_tracking',
      'email_support',
    ],
  },
  small_team: {
    max_clients: 100,
    features: [
      'basic_documentation',
      'mobile_capture',
      'gps_verification',
      'photo_documentation',
      'offline_mode',
      'client_management',
      'task_tracking',
      'email_support',
      'ai_notes',
      'assessment_templates',
      'team_collaboration',
      'cqc_compliance',
      'phone_support',
    ],
  },
  practice: {
    max_clients: -1, // Unlimited
    features: [
      'basic_documentation',
      'mobile_capture',
      'gps_verification',
      'photo_documentation',
      'offline_mode',
      'client_management',
      'task_tracking',
      'email_support',
      'ai_notes',
      'assessment_templates',
      'team_collaboration',
      'cqc_compliance',
      'phone_support',
      'custom_templates',
      'advanced_analytics',
      'api_access',
      'white_label',
      'dedicated_account_manager',
      'priority_support',
      'training_onboarding',
    ],
  },
};

/**
 * Check if plan supports a feature
 */
export function planSupportsFeature(plan: string, featureKey: string): boolean {
  const planFeatures = GRACE_NOTES_PLAN_FEATURES[plan.toLowerCase() as keyof typeof GRACE_NOTES_PLAN_FEATURES];
  return planFeatures ? planFeatures.features.includes(featureKey) : false;
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    solo: 'Solo',
    small_team: 'Small Team',
    practice: 'Practice',
  };
  return names[plan] || plan;
}

/**
 * Get plan pricing
 */
export function getPlanPricing(plan: string): number {
  const prices: Record<string, number> = {
    solo: 29,
    small_team: 79,
    practice: 199,
  };
  return prices[plan] || 0;
}
