'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import { useStripeCheckout } from '@/hooks/use-stripe-checkout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  X,
  Home,
  Users,
  Building2,
  Sparkles,
  Heart,
  Shield,
  Zap,
  ArrowRight,
  Info,
  FileText,
  MapPin,
  Brain
} from 'lucide-react';
import Link from 'next/link';
import HomeNav from '@/components/HomeNav';

const INDIVIDUAL_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    price: 0,
    yearlyPrice: 0,
    description: 'Basic features to get started',
    popular: false,
    features: [
      { name: '10 voice conversations per month', included: true },
      { name: 'Up to 5 reminders per month', included: true },
      { name: 'SMS reminder delivery', included: true },
      { name: '1 family member dashboard access', included: true },
      { name: 'Standard AI voice', included: true },
      { name: 'Email support', included: true },
      { name: '12-month data retention', included: true },
      { name: 'Voice cloning', included: false },
      { name: 'Voice call reminders', included: false },
      { name: 'Escalation alerts', included: false },
    ],
  },
  {
    name: 'Essential',
    slug: 'essential',
    price: 9.99,
    yearlyPrice: 99,
    description: 'Perfect for independent seniors and families',
    popular: false,
    features: [
      { name: 'Unlimited voice conversations', included: true },
      { name: 'Unlimited reminders', included: true },
      { name: 'SMS + voice call delivery', included: true },
      { name: 'Up to 3 family member dashboards', included: true },
      { name: 'Basic voice cloning (1 voice)', included: true },
      { name: 'Medication tracking', included: true },
      { name: 'Photo sharing (100 photos)', included: true },
      { name: 'Calendar & activity tracking', included: true },
      { name: 'Priority email support', included: true },
      { name: '12-month data retention', included: true },
    ],
  },
  {
    name: 'Plus',
    slug: 'plus',
    price: 19.99,
    yearlyPrice: 199,
    description: 'Advanced monitoring for active family care',
    popular: true,
    features: [
      { name: 'Everything in Essential, plus:', included: true, bold: true },
      { name: 'Advanced voice cloning (up to 3 voices)', included: true },
      { name: 'Escalation alerts for missed reminders', included: true },
      { name: 'Real-time family notifications', included: true },
      { name: 'Up to 5 family member dashboards', included: true },
      { name: 'Advanced medication reports', included: true },
      { name: 'Unlimited photo sharing', included: true },
      { name: 'Voice messages library', included: true },
      { name: 'Document storage (5GB)', included: true },
      { name: 'Priority phone support', included: true },
      { name: '24-month data retention', included: true },
    ],
  },
  {
    name: 'Premium',
    slug: 'premium',
    price: 34.99,
    yearlyPrice: 349,
    description: 'Complete care coordination with priority support',
    popular: false,
    features: [
      { name: 'Everything in Plus, plus:', included: true, bold: true },
      { name: 'Unlimited voice cloning', included: true },
      { name: 'AI wellness insights & trend analysis', included: true },
      { name: 'Emergency contact priority calling', included: true },
      { name: 'Unlimited family member dashboards', included: true },
      { name: 'Advanced analytics & reports', included: true },
      { name: 'Unlimited document storage', included: true },
      { name: 'Electronic signatures', included: true },
      { name: '24/7 priority support', included: true },
      { name: 'White-glove onboarding', included: true },
      { name: '36-month data retention', included: true },
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading: checkoutLoading, upgradeIndividualPlan } = useStripeCheckout();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handlePlanSelection = async (planSlug: string) => {
    if (planSlug === 'free') {
      router.push('/signup');
      return;
    }

    if (!user) {
      router.push(`/signup?plan=${planSlug}`);
      return;
    }

    await upgradeIndividualPlan(planSlug, billingCycle);
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    if (yearlyPrice === 0) return 0;
    const monthlyCost = monthlyPrice * 12;
    const savings = ((monthlyCost - yearlyPrice) / monthlyCost) * 100;
    return Math.round(savings);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <HomeNav />

      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Simple, transparent pricing
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Caring support for individuals and families. No hidden fees, cancel anytime.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-sky-blue text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-sky-blue text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Yearly
              <Badge className="absolute -top-2 -right-2 bg-mint-green text-deep-navy">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        <Tabs defaultValue="individual" className="w-full max-w-7xl mx-auto mb-12">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-12">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Individual & Family
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Care Facilities
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Care Professionals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {INDIVIDUAL_PLANS.map((plan) => {
                const displayPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
                const savings = calculateSavings(plan.price, plan.yearlyPrice);

                return (
                  <Card
                    key={plan.slug}
                    className={`relative flex flex-col ${
                      plan.popular
                        ? 'border-sky-blue border-2 shadow-xl scale-105'
                        : 'border-2'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-blue text-white text-sm font-semibold rounded-full">
                        Most Popular
                      </div>
                    )}

                    <CardHeader className="text-center pb-6">
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <div className="mb-2">
                        <span className="text-4xl font-bold text-deep-navy">
                          {displayPrice === 0 ? 'Free' : `£${displayPrice}`}
                        </span>
                        {displayPrice > 0 && (
                          <span className="text-slate-600 text-lg">
                            /{billingCycle === 'yearly' ? 'year' : 'month'}
                          </span>
                        )}
                      </div>
                      {billingCycle === 'yearly' && plan.price > 0 && (
                        <Badge variant="secondary" className="bg-mint-green/20 text-mint-green">
                          Save {savings}% (£{(plan.price * 12 - plan.yearlyPrice).toFixed(2)})
                        </Badge>
                      )}
                      <CardDescription className="text-slate-600 mt-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 mb-6 flex-1">
                        {plan.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className={`flex items-start gap-2 ${
                              feature.bold ? 'font-semibold text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {feature.included ? (
                              <CheckCircle2 className="w-5 h-5 text-mint-green flex-shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            )}
                            <span className="text-sm">{feature.name}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => handlePlanSelection(plan.slug)}
                        disabled={checkoutLoading}
                        className={`w-full h-12 rounded-[12px] font-semibold ${
                          plan.popular
                            ? 'bg-sky-blue hover:bg-sky-blue/90 text-white'
                            : 'bg-mint-green hover:bg-mint-green/90 text-deep-navy'
                        }`}
                      >
                        {checkoutLoading ? 'Loading...' : plan.slug === 'free' ? 'Get Started Free' : 'Choose Plan'}
                        {!checkoutLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-16 bg-gradient-to-br from-mint-green/10 to-sky-blue/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-deep-navy mb-6 text-center">
                Why Choose Grace Companion?
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-mint-green/20 flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-mint-green" />
                  </div>
                  <h4 className="font-semibold text-deep-navy mb-2">Voice Cloning Technology</h4>
                  <p className="text-slate-600 text-sm">
                    Reminders delivered in your loved one's voice for comfort and familiarity
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-sky-blue/20 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-sky-blue" />
                  </div>
                  <h4 className="font-semibold text-deep-navy mb-2">UK GDPR Compliant</h4>
                  <p className="text-slate-600 text-sm">
                    Your data is secure, encrypted, and stored in UK-based servers
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-coral-red/20 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-coral-red" />
                  </div>
                  <h4 className="font-semibold text-deep-navy mb-2">No Hardware Required</h4>
                  <p className="text-slate-600 text-sm">
                    Works on any smartphone, tablet, or computer - no expensive devices needed
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="organization">
            <div className="text-center mb-8">
              <p className="text-lg text-slate-600 mb-6">
                Comprehensive care management for facilities of all sizes
              </p>
              <Link href="/organization">
                <Button size="lg" className="bg-sky-blue hover:bg-sky-blue/90 text-white">
                  <Building2 className="w-5 h-5 mr-2" />
                  View Organization Plans
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Trial</CardTitle>
                  <div className="text-3xl font-bold text-deep-navy">Free</div>
                  <CardDescription>30 days, up to 10 residents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>Basic care management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>Family portal</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                  <div className="text-3xl font-bold text-deep-navy">£159</div>
                  <CardDescription>per month, up to 50 residents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>Care plans & assessments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>Staff scheduling</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-sky-blue border-2 shadow-xl scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-blue text-white text-sm font-semibold rounded-full">
                  Popular
                </div>
                <CardHeader>
                  <CardTitle>Professional</CardTitle>
                  <div className="text-3xl font-bold text-deep-navy">£399</div>
                  <CardDescription>per month, up to 150 residents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>Advanced analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>API access & integrations</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <div className="text-3xl font-bold text-deep-navy">Custom</div>
                  <CardDescription>Unlimited residents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>Multi-facility support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mint-green flex-shrink-0 mt-0.5" />
                      <span>24/7 dedicated support</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="professional">
            <div className="text-center mb-8">
              <p className="text-lg text-slate-600 mb-6">
                Professional documentation and practice management for independent social workers, community nurses, and care co-ordinators
              </p>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                14-day free trial on all plans
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <Card className="border-2 flex flex-col">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl mb-2">Solo</CardTitle>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-deep-navy">£29</span>
                    <span className="text-slate-600 text-lg">/month</span>
                  </div>
                  <CardDescription className="text-slate-600 mt-2">
                    Perfect for independent practitioners
                  </CardDescription>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 mt-2">
                    Up to 20 clients
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Mobile visit capture with GPS</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Voice-to-text documentation</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Basic assessment templates</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Client management system</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Task tracking</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Photo documentation</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Offline mode</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Email support</span>
                    </li>
                  </ul>
                  <Link href="/grace-notes/register?plan=solo" className="w-full">
                    <Button className="w-full h-12 rounded-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-emerald-500 border-2 shadow-xl scale-105 flex flex-col relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl mb-2">Small Team</CardTitle>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-deep-navy">£79</span>
                    <span className="text-slate-600 text-lg">/month</span>
                  </div>
                  <CardDescription className="text-slate-600 mt-2">
                    For small agencies and growing practices
                  </CardDescription>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 mt-2">
                    Up to 100 clients
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold">Everything in Solo, plus:</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">All UK statutory assessment templates</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">AI-powered note generation</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Advanced care planning</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Team collaboration tools</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">CQC compliance dashboard</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Priority email support</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Phone support</span>
                    </li>
                  </ul>
                  <Link href="/grace-notes/register?plan=small_team" className="w-full">
                    <Button className="w-full h-12 rounded-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 flex flex-col">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl mb-2">Practice</CardTitle>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-deep-navy">£199</span>
                    <span className="text-slate-600 text-lg">/month</span>
                  </div>
                  <CardDescription className="text-slate-600 mt-2">
                    Complete solution for established practices
                  </CardDescription>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 mt-2">
                    Unlimited clients
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold">Everything in Small Team, plus:</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Custom assessment templates</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Advanced analytics & reporting</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">API access for integrations</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">White-label options</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Dedicated account manager</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Priority phone support</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Training & onboarding</span>
                    </li>
                  </ul>
                  <Link href="/grace-notes/register?plan=practice" className="w-full">
                    <Button className="w-full h-12 rounded-[12px] font-semibold bg-slate-800 hover:bg-slate-900 text-white">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="mt-16 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-deep-navy mb-6 text-center">
                Why Choose Grace Notes?
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-deep-navy mb-2">Mobile-First Design</h4>
                  <p className="text-slate-600 text-sm">
                    GPS verification, photo documentation, and offline mode for capturing notes anywhere
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-deep-navy mb-2">AI-Powered Documentation</h4>
                  <p className="text-slate-600 text-sm">
                    Convert voice recordings to structured notes with context-aware AI assistance
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-deep-navy mb-2">CQC Compliance Built-In</h4>
                  <p className="text-slate-600 text-sm">
                    Audit trails, safeguarding alerts, and regulatory reporting ready for inspections
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="max-w-4xl mx-auto mb-12">
          <Card className="bg-sky-blue/5 border-sky-blue/20">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-sky-blue flex-shrink-0 mt-1" />
                <div>
                  <CardTitle className="text-xl mb-2">Frequently Asked Questions</CardTitle>
                  <div className="space-y-4 text-slate-700">
                    <div>
                      <p className="font-semibold mb-1">Can I change plans later?</p>
                      <p className="text-sm">
                        Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                        immediately, and we'll prorate any differences.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">What payment methods do you accept?</p>
                      <p className="text-sm">
                        We accept all major credit and debit cards. Payment is processed securely
                        through Stripe.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Is there a commitment period?</p>
                      <p className="text-sm">
                        No long-term contracts. You can cancel anytime and retain access until the end
                        of your billing period.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-deep-navy mb-4">Still have questions?</h3>
          <p className="text-slate-600 mb-6">
            Our team is here to help you find the perfect plan for your needs
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Sales
              </Button>
            </Link>
            <Link href="/faq">
              <Button size="lg" variant="outline">
                View FAQ
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
