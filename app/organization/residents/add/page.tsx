'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationSubscription } from '@/hooks/use-organization-subscription';
import { UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

const CARE_LEVELS = [
  { value: 'independent', label: 'Independent' },
  { value: 'assisted_living', label: 'Assisted Living' },
  { value: 'memory_care', label: 'Memory Care' },
  { value: 'skilled_nursing', label: 'Skilled Nursing' },
  { value: 'hospice', label: 'Hospice' },
];

const FALL_RISK_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function AddResident() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');
  const { subscription, checkResidents } = useOrganizationSubscription(organizationId || null);
  const [limitCheck, setLimitCheck] = useState<{allowed: boolean; current_count: number; max_allowed: number; reason: string} | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roomNumber: '',
    careLevel: 'assisted_living',
    admissionDate: new Date().toISOString().split('T')[0],
    primaryDiagnosis: '',
    allergies: '',
    dietaryRestrictions: '',
    mobilityStatus: '',
    fallRiskLevel: 'low',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    insuranceProvider: '',
    policyNumber: '',
  });

  useEffect(() => {
    loadOrganization();
  }, [user]);

  useEffect(() => {
    if (organizationId) {
      checkLimits();
    }
  }, [organizationId]);

  const checkLimits = async () => {
    const check = await checkResidents();
    setLimitCheck(check);
  };

  const loadOrganization = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      setOrganizationId(orgUser.organization_id);
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check resident limit before proceeding
    const check = await checkResidents();
    if (!check.allowed) {
      toast({
        title: 'Resident Limit Reached',
        description: check.reason + '. Please upgrade your plan to add more residents.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-12),
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'elder',
            registered_by_facility: true,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create resident account');

      await supabase.from('users').insert({
        id: authData.user.id,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        role: 'elder',
        organization_id: organizationId,
      });

      const allergiesArray = formData.allergies ? formData.allergies.split(',').map((a) => a.trim()) : [];
      const dietaryArray = formData.dietaryRestrictions
        ? formData.dietaryRestrictions.split(',').map((d) => d.trim())
        : [];

      await supabase.from('organization_residents').insert({
        organization_id: organizationId,
        resident_id: authData.user.id,
        room_number: formData.roomNumber,
        care_level: formData.careLevel,
        admission_date: formData.admissionDate,
        primary_diagnosis: formData.primaryDiagnosis,
        allergies: allergiesArray,
        dietary_restrictions: dietaryArray,
        mobility_status: formData.mobilityStatus,
        fall_risk_level: formData.fallRiskLevel,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relationship: formData.emergencyContactRelationship,
        insurance_provider: formData.insuranceProvider,
        policy_number: formData.policyNumber,
        is_active: true,
      });

      toast({
        title: 'Resident added successfully',
        description: `${formData.firstName} ${formData.lastName} has been added to your facility`,
      });

      router.push('/organization/residents');
    } catch (error: any) {
      toast({
        title: 'Error adding resident',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/organization/residents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Residents
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-blue-600" />
            Add New Resident
          </h1>
          <p className="text-gray-600 mt-1">Register a new resident to your facility</p>
        </div>

        {limitCheck && !limitCheck.allowed && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Resident limit reached:</strong> You have {limitCheck.current_count} of {limitCheck.max_allowed} residents.
              Please <Link href="/organization/settings" className="underline font-semibold">upgrade your plan</Link> to add more residents.
            </AlertDescription>
          </Alert>
        )}

        {limitCheck && limitCheck.allowed && limitCheck.max_allowed > 0 && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Residents:</strong> {limitCheck.current_count} of {limitCheck.max_allowed === -1 ? 'unlimited' : limitCheck.max_allowed} used.
              {subscription && <span className="ml-2">Current plan: <strong>{subscription.plan_name}</strong></span>}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic resident details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Care Details</CardTitle>
                <CardDescription>Room assignment and care level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roomNumber">Room Number *</Label>
                    <Input
                      id="roomNumber"
                      required
                      value={formData.roomNumber}
                      onChange={(e) => updateField('roomNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admissionDate">Admission Date *</Label>
                    <Input
                      id="admissionDate"
                      type="date"
                      required
                      value={formData.admissionDate}
                      onChange={(e) => updateField('admissionDate', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="careLevel">Care Level *</Label>
                  <Select value={formData.careLevel} onValueChange={(v) => updateField('careLevel', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fallRiskLevel">Fall Risk Level</Label>
                  <Select value={formData.fallRiskLevel} onValueChange={(v) => updateField('fallRiskLevel', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FALL_RISK_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
                <CardDescription>Health conditions and restrictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primaryDiagnosis">Primary Diagnosis</Label>
                  <Input
                    id="primaryDiagnosis"
                    value={formData.primaryDiagnosis}
                    onChange={(e) => updateField('primaryDiagnosis', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => updateField('allergies', e.target.value)}
                    placeholder="e.g., Penicillin, Peanuts, Latex"
                  />
                </div>

                <div>
                  <Label htmlFor="dietaryRestrictions">Dietary Restrictions (comma-separated)</Label>
                  <Textarea
                    id="dietaryRestrictions"
                    value={formData.dietaryRestrictions}
                    onChange={(e) => updateField('dietaryRestrictions', e.target.value)}
                    placeholder="e.g., Low sodium, Diabetic, Gluten-free"
                  />
                </div>

                <div>
                  <Label htmlFor="mobilityStatus">Mobility Status</Label>
                  <Input
                    id="mobilityStatus"
                    value={formData.mobilityStatus}
                    onChange={(e) => updateField('mobilityStatus', e.target.value)}
                    placeholder="e.g., Walker, Wheelchair, Independent"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>Primary emergency contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                    <Input
                      id="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => updateField('emergencyContactRelationship', e.target.value)}
                      placeholder="e.g., Daughter, Son, Spouse"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
                <CardDescription>Insurance and billing details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) => updateField('insuranceProvider', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="policyNumber">Policy Number</Label>
                  <Input
                    id="policyNumber"
                    value={formData.policyNumber}
                    onChange={(e) => updateField('policyNumber', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-end">
              <Link href="/organization/residents">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding Resident...' : 'Add Resident'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
