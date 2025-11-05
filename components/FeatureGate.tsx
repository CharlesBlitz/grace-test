'use client';

import { ReactNode } from 'react';
import { useFeatureGate } from '@/hooks/use-subscription';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  upgradeMessage?: string;
}

export default function FeatureGate({
  featureKey,
  children,
  fallback,
  showUpgrade = true,
  upgradeMessage = 'This feature is not available in your current plan',
}: FeatureGateProps) {
  const { hasAccess, loading } = useFeatureGate(featureKey);

  if (loading) {
    return (
      <div className="animate-pulse bg-slate-100 rounded-lg p-6">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgrade) {
      return (
        <Alert className="bg-amber-50 border-amber-200">
          <Lock className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="mb-3">{upgradeMessage}</p>
            <Link href="/pricing">
              <Button size="sm" className="bg-sky-blue hover:bg-sky-blue/90 text-white">
                View Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}
