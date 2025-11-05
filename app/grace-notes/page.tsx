'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Users, FileText, MapPin, Clock, Shield, Smartphone, Zap, Brain, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function GraceNotesPage() {
  const plans = [
    {
      name: 'Solo',
      price: '£29',
      period: '/month',
      description: 'Perfect for independent practitioners',
      maxClients: 20,
      features: [
        'Up to 20 active clients',
        'Mobile visit capture with GPS',
        'Voice-to-text documentation',
        'Basic assessment templates',
        'Client management system',
        'Task tracking',
        'Photo documentation',
        'Offline mode',
        'Email support',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Small Team',
      price: '£79',
      period: '/month',
      description: 'For small agencies and growing practices',
      maxClients: 100,
      features: [
        'Up to 100 active clients',
        'Everything in Solo, plus:',
        'All UK statutory assessment templates',
        'AI-powered note generation',
        'Advanced care planning',
        'Team collaboration tools',
        'CQC compliance dashboard',
        'Priority email support',
        'Phone support',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Practice',
      price: '£199',
      period: '/month',
      description: 'Complete solution for established practices',
      maxClients: null,
      features: [
        'Unlimited clients',
        'Everything in Small Team, plus:',
        'Custom assessment templates',
        'Advanced analytics & reporting',
        'API access for integrations',
        'White-label options',
        'Dedicated account manager',
        'Priority phone support',
        'Training & onboarding',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const comparisons = [
    {
      category: 'Magic Notes',
      description: 'Council-funded transcription tool',
      limitations: [
        'Only for council employees',
        'Enterprise pricing (hidden)',
        'Copy/paste to CMS required',
        'Generic prompts',
        'Limited to transcription',
      ],
    },
    {
      category: 'Grace Notes',
      description: 'Complete practice management',
      advantages: [
        'For independent practitioners',
        'Transparent pricing from £29',
        'Built-in client management',
        'UK statutory templates included',
        'Mobile-first with GPS & photos',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="pt-6 flex justify-end mb-6">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
              aria-label="Return to home page"
            >
              <Home className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Home</span>
            </Button>
          </Link>
        </div>
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-100 text-emerald-800 border-emerald-200">
            For Independent Care Professionals
          </Badge>
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Grace Notes
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            The complete practice management platform for social workers, community nurses, and care coordinators.
            Documentation, client management, and compliance all in one mobile-first solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/grace-notes/register">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                Start 14-Day Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-slate-300">
              Watch Demo
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-red-600">Magic Notes</CardTitle>
              <CardDescription>Council-funded transcription tool</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Only for council employees</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Enterprise pricing (hidden costs)</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Manual copy/paste to your CMS</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Generic prompts only</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Transcription only, no practice management</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 shadow-lg bg-emerald-50">
            <CardHeader>
              <CardTitle className="text-emerald-800">Grace Notes</CardTitle>
              <CardDescription>Complete practice management</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>For independent practitioners</strong> - no council needed</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Transparent pricing</strong> from £29/month</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Built-in client management</strong> system</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>UK statutory templates</strong> included (Care Act, MCA, CHC)</span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Mobile-first</strong> with GPS & photo documentation</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-slate-200">
            <CardHeader>
              <MapPin className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">Mobile Field Work</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              GPS check-in verification, photo documentation, and offline mode for capturing notes anywhere, even without signal.
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <FileText className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">Statutory Templates</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Pre-built templates for Care Act 2014, Mental Capacity Act, Carers Assessments, CHC, and more. Ready to use.
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <Brain className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">AI That Learns</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Contextual AI that learns your documentation style and provides personalized suggestions based on your caseload.
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <Shield className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">CQC Compliance</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Built-in compliance dashboard, audit trails, safeguarding alerts, and regulatory reporting for inspections.
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <Users className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">Client Management</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Complete CMS with scheduling, task tracking, care plans, and document storage. No separate system needed.
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <Smartphone className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">Progressive Web App</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Install to home screen, works offline, receives push notifications. Native app experience, zero app store hassle.
            </CardContent>
          </Card>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Choose Your Plan
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? 'border-emerald-500 border-2 shadow-xl'
                    : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    {plan.maxClients ? `Up to ${plan.maxClients} clients` : 'Unlimited clients'}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.cta === 'Contact Sales' ? '/grace-notes/contact' : '/grace-notes/register'}>
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-slate-600 mt-8">
            All plans include 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Built for Your Workflow
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                During Home Visits
              </h3>
              <ul className="space-y-2 text-slate-700">
                <li>• GPS check-in when you arrive</li>
                <li>• Voice dictation while observing</li>
                <li>• Take photos of living conditions, mobility aids</li>
                <li>• Works offline, syncs when back online</li>
                <li>• Quick client lookup between appointments</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                Back at the Office
              </h3>
              <ul className="space-y-2 text-slate-700">
                <li>• AI generates structured notes from your voice recordings</li>
                <li>• Complete statutory assessments with pre-built templates</li>
                <li>• Review and edit on larger screen</li>
                <li>• Generate reports for CQC inspections</li>
                <li>• Analyze caseload trends and compliance gaps</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center bg-emerald-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to transform your practice?
          </h2>
          <p className="text-xl mb-8 text-emerald-50">
            Join independent care professionals who are saving 8+ hours per week on documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/grace-notes/register">
              <Button size="lg" variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50 px-8">
                Start Free Trial
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-emerald-700">
              Book a Demo
            </Button>
          </div>
          <p className="text-emerald-100 mt-6">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
