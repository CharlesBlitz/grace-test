'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  Crown,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { getUserSubscription, getCurrentUsage, getFeatureLimit } from '@/lib/subscriptionService';
import { useStripeCheckout } from '@/hooks/use-stripe-checkout';
import HomeNav from '@/components/HomeNav';
import SubscriptionSuccessBanner from '@/components/SubscriptionSuccessBanner';

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: checkoutLoading, upgradeIndividualPlan } = useStripeCheckout();
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async (planSlug: string) => {
    await upgradeIndividualPlan(planSlug, billingCycle);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadSubscriptionData();
    }
  }, [user, authLoading, router]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      const sub = await getUserSubscription(user.id);
      setSubscription(sub);

      if (sub) {
        const conversationLimit = await getFeatureLimit(user.id, 'voice_conversations');
        const reminderLimit = await getFeatureLimit(user.id, 'reminders');

        const conversationUsage = conversationLimit !== -1 ? await getCurrentUsage(sub.id, 'voice_conversations') : 0;
        const reminderUsage = reminderLimit !== -1 ? await getCurrentUsage(sub.id, 'reminders') : 0;

        setUsage({
          conversations: {
            used: conversationUsage,
            limit: conversationLimit,
          },
          reminders: {
            used: reminderUsage,
            limit: reminderLimit,
          },
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'free':
        return 'bg-slate-100 text-slate-700';
      case 'essential':
        return 'bg-blue-100 text-blue-700';
      case 'plus':
        return 'bg-mint-green text-deep-navy';
      case 'premium':
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatUsage = (used: number, limit: number) => {
    if (limit === -1) {
      return `${used} / Unlimited`;
    }
    return `${used} / ${limit}`;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-12 flex items-center justify-center">
        <div className="text-2xl text-deep-navy animate-pulse">Loading...</div>
      </main>
    );
  }

  if (!subscription) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-12">
        <HomeNav />
        <div className="max-w-4xl mx-auto mt-16">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You don't have an active subscription. Choose a plan to get started.
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Link href="/pricing">
              <Button size="lg" className="bg-sky-blue hover:bg-sky-blue/90 text-white">
                <Sparkles className="w-5 h-5 mr-2" />
                View Plans & Pricing
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isPremium = subscription.plan_slug === 'premium';
  const isFree = subscription.plan_slug === 'free';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-12">
      <HomeNav />

      <div className="max-w-6xl mx-auto mt-16 space-y-8">
        <SubscriptionSuccessBanner />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Subscription & Billing</h1>
            <p className="text-slate-600">Manage your plan and view usage</p>
          </div>
          <Link href="/settings">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {isPremium && <Crown className="w-5 h-5 text-amber-500" />}
                    Your Plan
                  </CardTitle>
                  <CardDescription>Current subscription details</CardDescription>
                </div>
                <Badge className={getPlanColor(subscription.plan_slug)}>
                  {subscription.plan_name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-5 h-5 text-slate-400" />
                <span>
                  {subscription.status === 'trial'
                    ? 'Trial period'
                    : subscription.status === 'active'
                    ? 'Active subscription'
                    : subscription.status}
                </span>
              </div>

              {!isFree && (
                <div className="flex items-center gap-2 text-slate-700">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                  <span>Monthly billing</span>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                {subscription.features.slice(0, 5).map((feature: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {feature.feature_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      {feature.is_unlimited
                        ? ' (Unlimited)'
                        : feature.feature_limit
                        ? ` (${feature.feature_limit})`
                        : ''}
                    </span>
                  </div>
                ))}
                {subscription.features.length > 5 && (
                  <p className="text-sm text-slate-500 pt-2">
                    +{subscription.features.length - 5} more features
                  </p>
                )}
              </div>

              {!isPremium && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                      onClick={() => setBillingCycle('monthly')}
                      className="flex-1"
                    >
                      Monthly
                    </Button>
                    <Button
                      size="sm"
                      variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                      onClick={() => setBillingCycle('yearly')}
                      className="flex-1"
                    >
                      Yearly (Save 17%)
                    </Button>
                  </div>
                  <Link href="/pricing">
                    <Button className="w-full bg-sky-blue hover:bg-sky-blue/90 text-white">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View All Plans
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Track your monthly usage limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {usage.conversations && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Voice Conversations
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatUsage(usage.conversations.used, usage.conversations.limit)}
                    </span>
                  </div>
                  {usage.conversations.limit !== -1 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-sky-blue h-2 rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usage.conversations.used, usage.conversations.limit)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {usage.reminders && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Reminders Sent
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatUsage(usage.reminders.used, usage.reminders.limit)}
                    </span>
                  </div>
                  {usage.reminders.limit !== -1 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-mint-green h-2 rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usage.reminders.used, usage.reminders.limit)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {isFree && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Upgrade to Essential or higher for unlimited conversations and reminders
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 bg-gradient-to-br from-sky-blue/5 to-mint-green/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-blue" />
              Unlock More Features
            </CardTitle>
            <CardDescription>
              Explore higher tiers for advanced capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {isFree && (
                <>
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold text-deep-navy mb-2">Essential</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      {billingCycle === 'monthly' ? '£9.99/month' : '£99/year'}
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700 mb-4">
                      <li>• Unlimited conversations</li>
                      <li>• Voice cloning (1 voice)</li>
                      <li>• Up to 3 family members</li>
                    </ul>
                    <Button
                      size="sm"
                      onClick={() => handleUpgrade('essential')}
                      disabled={checkoutLoading}
                      className="w-full"
                    >
                      {checkoutLoading ? 'Loading...' : 'Upgrade'}
                    </Button>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-2 border-mint-green">
                    <Badge className="mb-2 bg-mint-green text-deep-navy">Popular</Badge>
                    <h4 className="font-semibold text-deep-navy mb-2">Plus</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      {billingCycle === 'monthly' ? '£19.99/month' : '£199/year'}
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700 mb-4">
                      <li>• 3 voice clones</li>
                      <li>• Escalation alerts</li>
                      <li>• Advanced reports</li>
                    </ul>
                    <Button
                      size="sm"
                      onClick={() => handleUpgrade('plus')}
                      disabled={checkoutLoading}
                      className="w-full bg-mint-green hover:bg-mint-green/90 text-deep-navy"
                    >
                      {checkoutLoading ? 'Loading...' : 'Upgrade'}
                    </Button>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300">
                    <Badge className="mb-2 bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                      Premium
                    </Badge>
                    <h4 className="font-semibold text-deep-navy mb-2">Premium</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      {billingCycle === 'monthly' ? '£34.99/month' : '£349/year'}
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700 mb-4">
                      <li>• Unlimited everything</li>
                      <li>• AI wellness insights</li>
                      <li>• 24/7 support</li>
                    </ul>
                    <Button
                      size="sm"
                      onClick={() => handleUpgrade('premium')}
                      disabled={checkoutLoading}
                      className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white"
                    >
                      {checkoutLoading ? 'Loading...' : 'Upgrade'}
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 text-center">
              <Link href="/pricing">
                <Button size="lg" className="bg-sky-blue hover:bg-sky-blue/90 text-white">
                  View All Plans
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {!isFree && (
          <Card className="border-2 border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-900">Cancel Subscription</CardTitle>
              <CardDescription>
                You can cancel anytime. You'll retain access until the end of your billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
