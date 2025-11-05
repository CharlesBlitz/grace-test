import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import {
  getUserSubscription,
  hasFeature,
  getFeatureLimit,
  canUseFeature,
  UserSubscription,
} from '@/lib/subscriptionService';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const sub = await getUserSubscription(user.id);
      setSubscription(sub);
      setError(null);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const checkFeature = async (featureKey: string): Promise<boolean> => {
    if (!user) return false;
    return await hasFeature(user.id, featureKey);
  };

  const checkUsage = async (featureKey: string): Promise<{ allowed: boolean; reason?: string }> => {
    if (!user || !subscription) {
      return { allowed: false, reason: 'Not authenticated' };
    }
    return await canUseFeature(user.id, subscription.id, featureKey);
  };

  const getLimit = async (featureKey: string): Promise<number | null> => {
    if (!user) return null;
    return await getFeatureLimit(user.id, featureKey);
  };

  return {
    subscription,
    loading,
    error,
    checkFeature,
    checkUsage,
    getLimit,
    refresh: loadSubscription,
    isPremium: subscription?.plan_slug === 'premium',
    isPlus: subscription?.plan_slug === 'plus' || subscription?.plan_slug === 'premium',
    isEssential: subscription?.plan_slug === 'essential' || subscription?.plan_slug === 'plus' || subscription?.plan_slug === 'premium',
    isFree: subscription?.plan_slug === 'free',
  };
}

export function useFeatureGate(featureKey: string) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    checkAccess();
  }, [user, featureKey]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const access = await hasFeature(user.id, featureKey);
      setHasAccess(access);
    } catch (err) {
      console.error('Error checking feature access:', err);
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
