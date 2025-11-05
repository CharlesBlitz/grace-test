'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Users, MapPin, Phone, Mail, Globe, CreditCard, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ORGANIZATION_TYPES = [
  { value: 'assisted_living', label: 'Assisted Living Facility' },
  { value: 'nursing_home', label: 'Nursing Home' },
  { value: 'memory_care', label: 'Memory Care Facility' },
  { value: 'independent_living', label: 'Independent Living Community' },
  { value: 'continuing_care', label: 'Continuing Care Retirement Community (CCRC)' },
  { value: 'home_health', label: 'Home Health Agency' },
  { value: 'adult_daycare', label: 'Adult Day Care Center' },
];

const SUBSCRIPTION_TIERS = [
  {
    value: 'trial',
    label: 'Free Trial',
    description: '30-day trial with up to 10 residents',
    price: 'Free for 30 days',
    features: ['Up to 10 residents', 'Basic care management', 'Family portal', 'Voice reminders', 'Email support'],
  },
  {
    value: 'basic',
    label: 'Basic',
    description: 'Essential features for small facilities',
    price: '£159/month',
    subtext: '£3.18 per resident',
    features: ['Up to 50 residents', 'Care plans & assessments', 'Staff scheduling', 'Analytics dashboard', 'Family portal', 'Phone support'],
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Advanced features for growing facilities',
    price: '£399/month',
    subtext: '£2.66 per resident',
    features: ['Up to 150 residents', 'All Basic features', 'Advanced analytics', 'Custom branding', 'API access', 'Priority support', 'Training included'],
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Full platform for large organisations',
    price: 'Custom Pricing',
    subtext: '£3-4 per resident/month',
    features: ['Unlimited residents', 'All Professional features', 'Multi-facility support', 'White-label option', 'Dedicated account manager', '24/7 support', 'Custom integrations'],
  },
];

export default function OrganizationRegistration() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    organizationType: 'assisted_living',
    licenseNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United Kingdom',
    phone: '',
    email: '',
    website: '',
    subscriptionTier: 'trial',
    billingEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          data: {
            first_name: formData.adminFirstName,
            last_name: formData.adminLastName,
            role: 'organization_admin',
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create admin user');
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          organization_type: formData.organizationType,
          license_number: formData.licenseNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          subscription_tier: formData.subscriptionTier,
          billing_email: formData.billingEmail || formData.email,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      await supabase.from('users').insert({
        id: authData.user.id,
        name: `${formData.adminFirstName} ${formData.adminLastName}`,
        email: formData.adminEmail,
        phone: formData.adminPhone,
        role: 'organization_admin',
        organization_id: orgData.id,
      });

      await supabase.from('organization_users').insert({
        organization_id: orgData.id,
        user_id: authData.user.id,
        role: 'organization_admin',
        is_active: true,
        can_manage_staff: true,
        can_manage_billing: true,
        can_export_data: true,
        hire_date: new Date().toISOString().split('T')[0],
      });

      await supabase.from('facility_settings').insert({
        organization_id: orgData.id,
      });

      toast.success('Organisation registered successfully! Your account is pending approval. You will receive an email once approved.');

      router.push('/organization/pending');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Organisation Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Sunrise Senior Living"
          />
        </div>

        <div>
          <Label htmlFor="organizationType">Organisation Type *</Label>
          <Select value={formData.organizationType} onValueChange={(v) => updateField('organizationType', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="licenseNumber">CQC Registration Number *</Label>
          <Input
            id="licenseNumber"
            value={formData.licenseNumber}
            onChange={(e) => updateField('licenseNumber', e.target.value)}
            placeholder="e.g., 1-123456789"
          />
          <p className="text-sm text-gray-500 mt-1">Your Care Quality Commission registration number</p>
        </div>

        <div>
          <Label htmlFor="address">Street Address *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 High Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder="London" />
          </div>
          <div>
            <Label htmlFor="state">County</Label>
            <Input id="state" value={formData.state} onChange={(e) => updateField('state', e.target.value)} placeholder="Greater London" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="zipCode">Postcode *</Label>
            <Input id="zipCode" value={formData.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} placeholder="SW1A 1AA" />
          </div>
          <div>
            <Label htmlFor="country">Country *</Label>
            <Input id="country" value={formData.country} onChange={(e) => updateField('country', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+44 20 1234 5678"
          />
        </div>

        <div>
          <Label htmlFor="email">Organisation Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="info@yourfacility.co.uk"
          />
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="https://www.yourfacility.co.uk"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid gap-6">
        {SUBSCRIPTION_TIERS.map((tier) => (
          <Card
            key={tier.value}
            className={`cursor-pointer transition-all ${
              formData.subscriptionTier === tier.value ? 'ring-2 ring-blue-600 border-blue-600' : 'hover:border-gray-400'
            }`}
            onClick={() => updateField('subscriptionTier', tier.value)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tier.label}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{tier.price}</div>
                  {tier.subtext && (
                    <div className="text-xs text-slate-500 mt-1">{tier.subtext}</div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Label htmlFor="billingEmail">Billing Email (if different)</Label>
        <Input
          id="billingEmail"
          type="email"
          value={formData.billingEmail}
          onChange={(e) => updateField('billingEmail', e.target.value)}
          placeholder="billing@yourfacility.co.uk"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="adminFirstName">First Name *</Label>
            <Input
              id="adminFirstName"
              value={formData.adminFirstName}
              onChange={(e) => updateField('adminFirstName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adminLastName">Last Name *</Label>
            <Input
              id="adminLastName"
              value={formData.adminLastName}
              onChange={(e) => updateField('adminLastName', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="adminEmail">Email *</Label>
          <Input
            id="adminEmail"
            type="email"
            value={formData.adminEmail}
            onChange={(e) => updateField('adminEmail', e.target.value)}
            placeholder="admin@yourfacility.co.uk"
          />
        </div>

        <div>
          <Label htmlFor="adminPhone">Phone Number *</Label>
          <Input
            id="adminPhone"
            type="tel"
            value={formData.adminPhone}
            onChange={(e) => updateField('adminPhone', e.target.value)}
            placeholder="+44 20 1234 5678"
          />
        </div>

        <div>
          <Label htmlFor="adminPassword">Password *</Label>
          <Input
            id="adminPassword"
            type="password"
            value={formData.adminPassword}
            onChange={(e) => updateField('adminPassword', e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </div>
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Organisation Details', icon: Building2, render: renderStep1 },
    { number: 2, title: 'Contact Information', icon: Phone, render: renderStep2 },
    { number: 3, title: 'Subscription Plan', icon: CreditCard, render: renderStep3 },
    { number: 4, title: 'Administrator Account', icon: Users, render: renderStep4 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Register Your Organisation</h1>
          <p className="text-lg text-gray-600">Join Grace Companion to provide exceptional care for your residents</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.number} className="flex-1">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      currentStep >= step.number
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle2 className="h-6 w-6" /> : step.number}
                  </div>
                  {step.number < steps.length && (
                    <div
                      className={`flex-1 h-1 mx-2 ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'}`}
                    />
                  )}
                </div>
                <div className="mt-2 text-xs font-medium text-gray-600 hidden sm:block">{step.title}</div>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = steps[currentStep - 1].icon;
                return Icon ? <Icon className="h-6 w-6" /> : null;
              })()}
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent>{steps[currentStep - 1].render()}</CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)}>
              Previous
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button onClick={() => setCurrentStep((prev) => prev + 1)} className="ml-auto">
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
              {loading ? 'Submitting...' : 'Complete Registration'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
