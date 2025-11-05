import { useState } from 'react';
import { createUpgradeCheckoutSession, createOrganizationCheckoutSession, createGraceNotesCheckoutSession } from '@/lib/stripeClient';
import { toast } from '@/hooks/use-toast';

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgradeIndividualPlan = async (planSlug: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    setLoading(true);
    setError(null);

    try {
      await createUpgradeCheckoutSession(planSlug, billingCycle);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start checkout process';
      setError(errorMessage);
      toast({
        title: 'Checkout Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const upgradeOrganizationPlan = async (planSlug: string) => {
    setLoading(true);
    setError(null);

    try {
      await createOrganizationCheckoutSession(planSlug);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start checkout process';
      setError(errorMessage);
      toast({
        title: 'Checkout Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const upgradeGraceNotesPlan = async (planSlug: string) => {
    setLoading(true);
    setError(null);

    try {
      await createGraceNotesCheckoutSession(planSlug);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start checkout process';
      setError(errorMessage);
      toast({
        title: 'Checkout Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    upgradeIndividualPlan,
    upgradeOrganizationPlan,
    upgradeGraceNotesPlan,
  };
}
