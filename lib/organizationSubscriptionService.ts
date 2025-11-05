import { supabase } from './supabaseClient';

export interface OrganizationSubscription {
  subscription_id: string;
  plan_slug: string;
  plan_name: string;
  status: string;
  max_residents: number;
  features: {
    feature_key: string;
    feature_limit: number | null;
    is_unlimited: boolean;
  }[];
}

export interface ResidentLimitCheck {
  allowed: boolean;
  current_count: number;
  max_allowed: number;
  reason: string;
}

/**
 * Get organization subscription with all features
 */
export async function getOrganizationSubscription(
  organizationId: string
): Promise<OrganizationSubscription | null> {
  try {
    const { data, error } = await supabase.rpc('get_organization_subscription', {
      p_organization_id: organizationId,
    });

    if (error) {
      console.error('Error fetching organization subscription:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const features = data.map((row: any) => ({
      feature_key: row.feature_key,
      feature_limit: row.feature_limit,
      is_unlimited: row.is_unlimited,
    })).filter((f: any) => f.feature_key);

    return {
      subscription_id: data[0].subscription_id,
      plan_slug: data[0].plan_slug,
      plan_name: data[0].plan_name,
      status: data[0].status,
      max_residents: data[0].max_residents,
      features,
    };
  } catch (error) {
    console.error('Error in getOrganizationSubscription:', error);
    return null;
  }
}

/**
 * Check if organization has access to a specific feature
 */
export async function checkOrganizationFeature(
  organizationId: string,
  featureKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_organization_tier_access', {
      p_organization_id: organizationId,
      p_feature_key: featureKey,
    });

    if (error) {
      console.error('Error checking organization feature:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in checkOrganizationFeature:', error);
    return false;
  }
}

/**
 * Check if organization can add more residents
 */
export async function checkResidentLimit(
  organizationId: string
): Promise<ResidentLimitCheck> {
  try {
    const { data, error } = await supabase.rpc('enforce_resident_limits', {
      p_organization_id: organizationId,
    });

    if (error) {
      console.error('Error checking resident limit:', error);
      return {
        allowed: false,
        current_count: 0,
        max_allowed: 0,
        reason: 'Failed to check resident limit',
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
    console.error('Error in checkResidentLimit:', error);
    return {
      allowed: false,
      current_count: 0,
      max_allowed: 0,
      reason: 'Error checking limit',
    };
  }
}

/**
 * Organization tier feature mappings
 */
export const ORGANIZATION_TIER_FEATURES = {
  trial: [
    'basic_care_management',
    'family_portal',
    'resident_profiles',
  ],
  basic: [
    'basic_care_management',
    'family_portal',
    'resident_profiles',
    'care_plans',
    'assessments',
    'staff_scheduling',
    'medication_tracking',
  ],
  professional: [
    'basic_care_management',
    'family_portal',
    'resident_profiles',
    'care_plans',
    'assessments',
    'staff_scheduling',
    'medication_tracking',
    'advanced_analytics',
    'api_access',
    'integrations',
    'incident_management',
    'dols_mca_management',
  ],
  enterprise: [
    'basic_care_management',
    'family_portal',
    'resident_profiles',
    'care_plans',
    'assessments',
    'staff_scheduling',
    'medication_tracking',
    'advanced_analytics',
    'api_access',
    'integrations',
    'incident_management',
    'dols_mca_management',
    'multi_facility',
    'white_label',
    'dedicated_support',
    'custom_integrations',
  ],
};

/**
 * Check if organization tier supports a feature
 */
export function tierSupportsFeature(tier: string, featureKey: string): boolean {
  const tierFeatures = ORGANIZATION_TIER_FEATURES[tier.toLowerCase() as keyof typeof ORGANIZATION_TIER_FEATURES];
  return tierFeatures ? tierFeatures.includes(featureKey) : false;
}
