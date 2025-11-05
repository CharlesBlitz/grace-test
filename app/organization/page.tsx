'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  Shield,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowRight,
  Heart,
  MessageSquare,
  Bell,
  FileText,
  Activity,
  Home
} from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  {
    icon: Users,
    title: 'Resident Management',
    description: 'Manage all your residents from one central dashboard with comprehensive care profiles.'
  },
  {
    icon: Heart,
    title: 'Voice-First Care',
    description: 'Grace uses natural conversation to support residents with dementia and cognitive challenges.'
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Automated medication, meal, and activity reminders delivered through voice.'
  },
  {
    icon: MessageSquare,
    title: 'Family Portal',
    description: 'Keep families connected with real-time updates and secure messaging.'
  },
  {
    icon: Activity,
    title: 'Care Team Co-ordination',
    description: 'Assign staff to residents, manage shifts, and track care tasks seamlessly.'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description: 'Gain insights into resident well-being, staff performance, and operational efficiency.'
  },
  {
    icon: FileText,
    title: 'Care Plans & Assessments',
    description: 'Create, track, and update care plans with standardized assessment tools.'
  },
  {
    icon: Shield,
    title: 'GDPR Compliant',
    description: 'Built with UK data protection requirements in mind, including audit trails and consent management.'
  },
];

const BENEFITS = [
  'Reduce staff workload with automated reminders and task management',
  'Improve resident satisfaction through personalised, voice-based interactions',
  'Enhance family engagement with transparent communication',
  'Demonstrate compliance with care standards and regulations',
  'Gain actionable insights from comprehensive analytics',
  'Scale from small facilities to multi-location enterprises'
];

const PRICING_TIERS = [
  {
    name: 'Trial',
    price: 'Free',
    period: '30 days',
    residents: 'Up to 10',
    features: ['Basic care management', 'Family portal', 'Voice reminders', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false
  },
  {
    name: 'Basic',
    price: '£159',
    period: 'per month',
    residents: 'Up to 50',
    features: ['Care plans & assessments', 'Staff scheduling', 'Analytics dashboard', 'Family portal', 'Phone support'],
    cta: 'Get Started',
    highlighted: false
  },
  {
    name: 'Professional',
    price: '£399',
    period: 'per month',
    residents: 'Up to 150',
    features: ['All Basic features', 'Advanced analytics', 'Custom branding', 'API access', 'Priority support', 'Training included'],
    cta: 'Get Started',
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    residents: 'Unlimited',
    features: ['All Professional features', 'Multi-facility support', 'White-label option', 'Dedicated account manager', '24/7 support', 'Custom integrations'],
    cta: 'Contact Sales',
    highlighted: false
  }
];

export default function OrganizationLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-6 flex justify-end">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-slate-100 flex items-center gap-2"
              aria-label="Return to home page"
            >
              <Home className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Home</span>
            </Button>
          </Link>
        </div>
        {/* Hero Section */}
        <section className="py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-blue/10 text-sky-blue text-sm font-medium mb-6">
            <Building2 className="w-4 h-4" />
            For Care Facilities & Organisations
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-deep-navy mb-6 leading-tight">
            Transform Care Delivery with
            <br />
            <span className="text-sky-blue">Grace Companion</span>
          </h1>

          <p className="text-xl md:text-2xl text-deep-navy/70 mb-8 max-w-3xl mx-auto leading-relaxed">
            The voice-first care platform designed for assisted living facilities, nursing homes, and care organisations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/organization/register">
              <Button size="lg" className="h-14 px-8 text-lg rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold">
                <ArrowRight className="w-5 h-5 mr-2" />
                Register Your Facility
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-[16px] font-semibold">
                Schedule a Demo
              </Button>
            </Link>
          </div>

          <p className="text-sm text-deep-navy/60 mt-6">
            Free 30-day trial • No credit card required • Setup in minutes
          </p>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-mint-green/10 rounded-[32px] mb-16">
          <div className="px-8 md:px-12">
            <h2 className="text-3xl md:text-4xl font-bold text-deep-navy text-center mb-12">
              Why Care Facilities Choose Grace
            </h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {BENEFITS.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" />
                  <p className="text-deep-navy text-lg">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-deep-navy text-center mb-4">
            Everything You Need to Deliver Exceptional Care
          </h2>
          <p className="text-xl text-deep-navy/70 text-center mb-12 max-w-3xl mx-auto">
            Comprehensive tools designed specifically for the unique challenges of senior care.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-sky-blue/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-[12px] bg-sky-blue/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-sky-blue" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-deep-navy text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-deep-navy/70 text-center mb-12">
            Choose the plan that fits your facility size and needs.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {PRICING_TIERS.map((tier, index) => (
              <Card
                key={index}
                className={`relative ${tier.highlighted ? 'border-sky-blue border-2 shadow-xl scale-105' : 'border-2'}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-blue text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-deep-navy">{tier.price}</span>
                    {tier.period !== 'contact us' && (
                      <span className="text-deep-navy/60 text-lg">/{tier.period}</span>
                    )}
                  </div>
                  <p className="text-deep-navy/70 font-medium">{tier.residents} residents</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-mint-green flex-shrink-0 mt-0.5" />
                        <span className="text-deep-navy/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/organization/register" className="block">
                    <Button
                      className={`w-full h-12 rounded-[12px] font-semibold ${
                        tier.highlighted
                          ? 'bg-sky-blue hover:bg-sky-blue/90 text-white'
                          : 'bg-mint-green hover:bg-mint-green/90 text-deep-navy'
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <Card className="bg-gradient-to-br from-sky-blue to-sky-blue/80 border-none text-white">
            <CardHeader className="space-y-6 py-12">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <CardTitle className="text-3xl md:text-4xl">
                Ready to Transform Your Care Facility?
              </CardTitle>
              <CardDescription className="text-xl text-white/90 max-w-2xl mx-auto">
                Join forward-thinking care organisations already using Grace Companion to deliver better care outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/organization/register">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-[16px] bg-white hover:bg-white/90 text-sky-blue font-semibold">
                    <Building2 className="w-5 h-5 mr-2" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-[16px] border-2 border-white text-white hover:bg-white/10 font-semibold">
                    Talk to Our Team
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer Links */}
        <section className="py-8 border-t border-deep-navy/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-deep-navy/60">
              Questions?{' '}
              <Link href="/contact" className="text-sky-blue font-semibold hover:underline">
                Contact our sales team
              </Link>
            </p>
            <p className="text-deep-navy/60">
              Individual or family account?{' '}
              <Link href="/signup" className="text-sky-blue font-semibold hover:underline">
                Sign up here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
