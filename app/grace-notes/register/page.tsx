'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

export default function GraceNotesRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    professionalTitle: '',
    registrationNumber: '',
    registrationBody: '',
    phone: '',
    organizationName: '',
    organizationType: '',
    selectedPlan: 'solo',
  });

  const plans = [
    {
      id: 'solo',
      name: 'Solo',
      price: '£29',
      maxClients: 20,
      features: ['Up to 20 clients', 'GPS verification', 'Voice notes', 'Basic templates'],
    },
    {
      id: 'small_team',
      name: 'Small Team',
      price: '£79',
      maxClients: 100,
      features: ['Up to 100 clients', 'All statutory templates', 'AI notes', 'Team tools'],
      popular: true,
    },
    {
      id: 'practice',
      name: 'Practice',
      price: '£199',
      maxClients: null,
      features: ['Unlimited clients', 'Custom templates', 'API access', 'Priority support'],
    },
  ];

  function handleInputChange(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
  }

  async function handleCreateAccount() {
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        setStep(2);
        toast.success('Account created successfully');
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteRegistration() {
    if (!formData.professionalTitle) {
      toast.error('Professional title is required');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user found');
      }

      const selectedPlan = plans.find(p => p.id === formData.selectedPlan);

      const practitioner = {
        user_id: user.id,
        professional_title: formData.professionalTitle,
        registration_number: formData.registrationNumber || null,
        registration_body: formData.registrationBody || null,
        phone: formData.phone || null,
        email: formData.email,
        organization_name: formData.organizationName || null,
        organization_type: formData.organizationType || null,
        subscription_plan: formData.selectedPlan,
        subscription_status: 'trial',
        max_clients: selectedPlan?.maxClients || 20,
      };

      const { error: practitionerError } = await supabase
        .from('grace_notes_practitioners')
        .insert(practitioner);

      if (practitionerError) throw practitionerError;

      toast.success('Registration complete! Starting your 14-day free trial.');
      router.push('/grace-notes/dashboard');
    } catch (error: any) {
      console.error('Error completing registration:', error);
      toast.error(error.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/grace-notes">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Grace Notes
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-slate-600">
            14 days free, no credit card required
          </p>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Account</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200'
              }`}>
                2
              </div>
              <span className="font-medium">Professional Details</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>
                Enter your email and create a secure password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/grace-notes/login" className="text-emerald-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>
                  Tell us about your practice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="professionalTitle">Professional Title *</Label>
                  <Input
                    id="professionalTitle"
                    placeholder="e.g., Social Worker, Community Nurse, Care Coordinator"
                    value={formData.professionalTitle}
                    onChange={(e) => handleInputChange('professionalTitle', e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationBody">Registration Body</Label>
                    <Input
                      id="registrationBody"
                      placeholder="e.g., Social Work England, NMC"
                      value={formData.registrationBody}
                      onChange={(e) => handleInputChange('registrationBody', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      placeholder="Professional registration number"
                      value={formData.registrationNumber}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Mobile or work number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="organizationName">Organization Name (Optional)</Label>
                  <Input
                    id="organizationName"
                    placeholder="Your agency or practice name"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="organizationType">Organization Type (Optional)</Label>
                  <select
                    id="organizationType"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.organizationType}
                    onChange={(e) => handleInputChange('organizationType', e.target.value)}
                  >
                    <option value="">Select type...</option>
                    <option value="independent">Independent Practitioner</option>
                    <option value="agency">Small Agency</option>
                    <option value="local_authority">Local Authority</option>
                    <option value="nhs">NHS</option>
                    <option value="charity">Charity</option>
                    <option value="private">Private Practice</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>
                  Start with a 14-day free trial on any plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handleInputChange('selectedPlan', plan.id)}
                      className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                        formData.selectedPlan === plan.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {plan.popular && (
                        <Badge className="absolute -top-2 right-4 bg-emerald-600">
                          Popular
                        </Badge>
                      )}
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        {plan.price}<span className="text-sm font-normal text-slate-600">/mo</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {plan.maxClients ? `Up to ${plan.maxClients} clients` : 'Unlimited clients'}
                      </p>
                      <ul className="mt-4 space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCompleteRegistration}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-slate-600">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
