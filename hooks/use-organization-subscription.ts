import { useState, useEffect } from 'react';
import {
  getOrganizationSubscription,
  checkOrganizationFeature,
  checkResidentLimit,
  OrganizationSubscription,
  ResidentLimitCheck,
} from '@/lib/organizationSubscriptionService';

export function useOrganizationSubscription(organizationId: string | null) {
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    loadSubscription();
  }, [organizationId]);

  const loadSubscription = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const sub = await getOrganizationSubscription(organizationId);
      setSubscription(sub);
      setError(null);
    } catch (err) {
      console.error('Error loading organization subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const checkFeature = async (featureKey: string): Promise<boolean> => {
    if (!organizationId) return false;
    return await checkOrganizationFeature(organizationId, featureKey);
  };

  const checkResidents = async (): Promise<ResidentLimitCheck> => {
    if (!organizationId) {
      return {
        allowed: false,
        current_count: 0,
        max_allowed: 0,
        reason: 'No organization ID',
      };
    }
    return await checkResidentLimit(organizationId);
  };

  return {
    subscription,
    loading,
    error,
    checkFeature,
    checkResidents,
    refresh: loadSubscription,
    isTrial: subscription?.plan_slug === 'trial',
    isBasic: subscription?.plan_slug === 'basic',
    isProfessional: subscription?.plan_slug === 'professional' || subscription?.plan_slug === 'enterprise',
    isEnterprise: subscription?.plan_slug === 'enterprise',
  };
}

export function useOrganizationFeatureGate(
  organizationId: string | null,
  featureKey: string
) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    checkAccess();
  }, [organizationId, featureKey]);

  const checkAccess = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const access = await checkOrganizationFeature(organizationId, featureKey);
      setHasAccess(access);
    } catch (err) {
      console.error('Error checking organization feature access:', err);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasAccess,
    loading,
    refresh: checkAccess,
  };
}
