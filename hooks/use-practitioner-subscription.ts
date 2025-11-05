import { useState, useEffect } from 'react';
import {
  getPractitionerSubscription,
  checkPractitionerFeature,
  checkClientLimit,
  PractitionerSubscription,
  ClientLimitCheck,
} from '@/lib/graceNotesSubscriptionService';

export function usePractitionerSubscription(practitionerId: string | null) {
  const [subscription, setSubscription] = useState<PractitionerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!practitionerId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    loadSubscription();
  }, [practitionerId]);

  const loadSubscription = async () => {
    if (!practitionerId) return;

    try {
      setLoading(true);
      const sub = await getPractitionerSubscription(practitionerId);
      setSubscription(sub);
      setError(null);
    } catch (err) {
      console.error('Error loading practitioner subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const checkFeature = async (featureKey: string): Promise<boolean> => {
    if (!practitionerId) return false;
    return await checkPractitionerFeature(practitionerId, featureKey);
  };

  const checkClients = async (): Promise<ClientLimitCheck> => {
    if (!practitionerId) {
      return {
        allowed: false,
        current_count: 0,
        max_allowed: 0,
        reason: 'No practitioner ID',
      };
    }
    return await checkClientLimit(practitionerId);
  };

  return {
    subscription,
    loading,
    error,
    checkFeature,
    checkClients,
    refresh: loadSubscription,
    isSolo: subscription?.subscription_plan === 'solo',
    isSmallTeam: subscription?.subscription_plan === 'small_team',
    isPractice: subscription?.subscription_plan === 'practice',
  };
}

export function usePractitionerFeatureGate(
  practitionerId: string | null,
  featureKey: string
) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!practitionerId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    checkAccess();
  }, [practitionerId, featureKey]);

  const checkAccess = async () => {
    if (!practitionerId) return;

    try {
      setLoading(true);
      const access = await checkPractitionerFeature(practitionerId, featureKey);
      setHasAccess(access);
    } catch (err) {
      console.error('Error checking practitioner feature access:', err);
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
