'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  Shield,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  Calendar,
} from 'lucide-react';

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  room_number: string;
}

interface Restriction {
  id: string;
  description: string;
}

interface Condition {
  id: string;
  description: string;
}

export default function CreateDoLSPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const residentId = searchParams.get('resident');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);

  const [formData, setFormData] = useState({
    resident_id: residentId || '',
    authorization_type: 'standard',
    authorization_reference: '',
    supervisory_body: '',
    application_date: new Date().toISOString().split('T')[0],
    authorization_start_date: '',
    authorization_end_date: '',
    authorization_granted_date: '',
    status: 'pending',
    deprivation_reason: '',
    managing_authority: '',
    relevant_person_representative: '',
    imca_appointed: false,
    imca_details: '',
    urgent_authorization_used: false,
    urgent_start_date: '',
    urgent_end_date: '',
    next_review_date: '',
  });

  const [restrictions, setRestrictions] = useState<Restriction[]>([
    { id: crypto.randomUUID(), description: '' },
  ]);

  const [conditions, setConditions] = useState<Condition[]>([
    { id: crypto.randomUUID(), description: '' },
  ]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
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

      const { data: residentsData } = await supabase
        .from('organization_residents')
        .select('id, first_name, last_name, room_number')
        .eq('organization_id', orgUser.organization_id)
        .eq('status', 'active')
        .order('last_name');

      if (residentsData) setResidents(residentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load residents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addRestriction = () => {
    setRestrictions([...restrictions, { id: crypto.randomUUID(), description: '' }]);
  };

  const removeRestriction = (id: string) => {
    setRestrictions(restrictions.filter((r) => r.id !== id));
  };

  const updateRestriction = (id: string, description: string) => {
    setRestrictions(restrictions.map((r) => (r.id === id ? { ...r, description } : r)));
  };

  const addCondition = () => {
    setConditions([...conditions, { id: crypto.randomUUID(), description: '' }]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, description: string) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, description } : c)));
  };

  const calculateReviewDate = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (duration <= 30) {
      const reviewDate = new Date(start);
      reviewDate.setDate(reviewDate.getDate() + 14);
      return reviewDate.toISOString().split('T')[0];
    } else if (duration <= 90) {
      const reviewDate = new Date(start);
      reviewDate.setMonth(reviewDate.getMonth() + 1);
      return reviewDate.toISOString().split('T')[0];
    } else {
      const reviewDate = new Date(start);
      reviewDate.setMonth(reviewDate.getMonth() + 3);
      return reviewDate.toISOString().split('T')[0];
    }
  };

  useEffect(() => {
    if (formData.authorization_start_date && formData.authorization_end_date) {
      const reviewDate = calculateReviewDate(
        formData.authorization_start_date,
        formData.authorization_end_date
      );
      setFormData((prev) => ({ ...prev, next_review_date: reviewDate }));
    }
  }, [formData.authorization_start_date, formData.authorization_end_date]);

  const handleSubmit = async () => {
    if (!formData.resident_id || !formData.supervisory_body || !formData.deprivation_reason) {
      toast({
        title: 'Validation error',
        description: 'Please complete all required fields',
        variant: 'destructive',
      });
      return;
    }

    const validRestrictions = restrictions.filter((r) => r.description.trim() !== '');
    const validConditions = conditions.filter((c) => c.description.trim() !== '');

    setSaving(true);

    try {
      const urgentDates =
        formData.urgent_authorization_used && formData.urgent_start_date && formData.urgent_end_date
          ? {
              start_date: formData.urgent_start_date,
              end_date: formData.urgent_end_date,
            }
          : {};

      const { error } = await supabase.from('dols_authorizations').insert({
        organization_id: organizationId,
        resident_id: formData.resident_id,
        authorization_type: formData.authorization_type,
        authorization_reference: formData.authorization_reference,
        supervisory_body: formData.supervisory_body,
        application_date: formData.application_date,
        authorization_start_date: formData.authorization_start_date || null,
        authorization_end_date: formData.authorization_end_date || null,
        authorization_granted_date: formData.authorization_granted_date || null,
        status: formData.status,
        deprivation_reason: formData.deprivation_reason,
        restrictions_imposed: validRestrictions.map((r) => r.description),
        conditions_attached: validConditions.map((c) => c.description),
        managing_authority: formData.managing_authority,
        relevant_person_representative: formData.relevant_person_representative,
        imca_appointed: formData.imca_appointed,
        imca_details: formData.imca_details,
        urgent_authorization_used: formData.urgent_authorization_used,
        urgent_authorization_dates: urgentDates,
        next_review_date: formData.next_review_date || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'DoLS authorization saved',
        description: 'Deprivation of Liberty Safeguards authorization has been recorded',
      });

      router.push(`/organization/dols?resident=${formData.resident_id}`);
    } catch (error: any) {
      console.error('Error saving DoLS:', error);
      toast({
        title: 'Error saving authorization',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Register DoLS Authorization
          </h1>
          <p className="text-gray-600 mt-2">
            Deprivation of Liberty Safeguards - Record authorization details
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about the DoLS authorization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resident">Resident *</Label>
                <Select
                  value={formData.resident_id}
                  onValueChange={(v) => setFormData({ ...formData, resident_id: v })}
                  disabled={!!residentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resident" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents.map((resident) => (
                      <SelectItem key={resident.id} value={resident.id}>
                        {resident.first_name} {resident.last_name} - Room {resident.room_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="auth_type">Authorization Type *</Label>
                <Select
                  value={formData.authorization_type}
                  onValueChange={(v) => setFormData({ ...formData, authorization_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Authorization</SelectItem>
                    <SelectItem value="urgent">Urgent Authorization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supervisory_body">Supervisory Body (Local Authority) *</Label>
                <Input
                  id="supervisory_body"
                  value={formData.supervisory_body}
                  onChange={(e) => setFormData({ ...formData, supervisory_body: e.target.value })}
                  placeholder="e.g., Kent County Council"
                />
              </div>

              <div>
                <Label htmlFor="managing_authority">Managing Authority (Care Home)</Label>
                <Input
                  id="managing_authority"
                  value={formData.managing_authority}
                  onChange={(e) => setFormData({ ...formData, managing_authority: e.target.value })}
                  placeholder="e.g., Sunshine Care Home"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auth_reference">Authorization Reference Number</Label>
                <Input
                  id="auth_reference"
                  value={formData.authorization_reference}
                  onChange={(e) =>
                    setFormData({ ...formData, authorization_reference: e.target.value })
                  }
                  placeholder="e.g., DoLS-2024-12345"
                />
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Application</SelectItem>
                    <SelectItem value="granted">Granted</SelectItem>
                    <SelectItem value="refused">Refused</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="deprivation_reason">Reason for Deprivation of Liberty *</Label>
              <Textarea
                id="deprivation_reason"
                value={formData.deprivation_reason}
                onChange={(e) => setFormData({ ...formData, deprivation_reason: e.target.value })}
                placeholder="Explain why the deprivation of liberty is necessary and proportionate"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authorization Dates</CardTitle>
            <CardDescription>Key dates for the DoLS authorization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="application_date">Application Date *</Label>
                <Input
                  id="application_date"
                  type="date"
                  value={formData.application_date}
                  onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="granted_date">Authorization Granted Date</Label>
                <Input
                  id="granted_date"
                  type="date"
                  value={formData.authorization_granted_date}
                  onChange={(e) =>
                    setFormData({ ...formData, authorization_granted_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Authorization Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.authorization_start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, authorization_start_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="end_date">Authorization End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.authorization_end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, authorization_end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="review_date">Next Review Date</Label>
              <Input
                id="review_date"
                type="date"
                value={formData.next_review_date}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
              />
              <p className="text-sm text-gray-600 mt-1">
                Automatically calculated based on authorization duration
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="urgent_auth"
                checked={formData.urgent_authorization_used}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, urgent_authorization_used: !!checked })
                }
              />
              <Label htmlFor="urgent_auth" className="text-base">
                Urgent Authorization Was Used
              </Label>
            </div>

            {formData.urgent_authorization_used && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <Label htmlFor="urgent_start">Urgent Authorization Start Date</Label>
                  <Input
                    id="urgent_start"
                    type="date"
                    value={formData.urgent_start_date}
                    onChange={(e) => setFormData({ ...formData, urgent_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="urgent_end">Urgent Authorization End Date</Label>
                  <Input
                    id="urgent_end"
                    type="date"
                    value={formData.urgent_end_date}
                    onChange={(e) => setFormData({ ...formData, urgent_end_date: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Restrictions Imposed</CardTitle>
                <CardDescription>Specific restrictions on the person's liberty</CardDescription>
              </div>
              <Button onClick={addRestriction} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Restriction
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {restrictions.map((restriction, index) => (
              <div key={restriction.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Textarea
                    value={restriction.description}
                    onChange={(e) => updateRestriction(restriction.id, e.target.value)}
                    placeholder={`Restriction ${index + 1} (e.g., "Prevented from leaving building unaccompanied")`}
                    rows={2}
                  />
                </div>
                {restrictions.length > 1 && (
                  <Button
                    onClick={() => removeRestriction(restriction.id)}
                    variant="ghost"
                    size="icon"
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conditions Attached</CardTitle>
                <CardDescription>Conditions or requirements attached to the authorization</CardDescription>
              </div>
              <Button onClick={addCondition} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Textarea
                    value={condition.description}
                    onChange={(e) => updateCondition(condition.id, e.target.value)}
                    placeholder={`Condition ${index + 1} (e.g., "Regular contact with family to be maintained")`}
                    rows={2}
                  />
                </div>
                {conditions.length > 1 && (
                  <Button
                    onClick={() => removeCondition(condition.id)}
                    variant="ghost"
                    size="icon"
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Representatives and Advocates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rpr">Relevant Person's Representative (RPR)</Label>
              <Input
                id="rpr"
                value={formData.relevant_person_representative}
                onChange={(e) =>
                  setFormData({ ...formData, relevant_person_representative: e.target.value })
                }
                placeholder="Name and contact details of RPR"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="imca"
                checked={formData.imca_appointed}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, imca_appointed: !!checked })
                }
              />
              <Label htmlFor="imca" className="text-base">
                Independent Mental Capacity Advocate (IMCA) Appointed
              </Label>
            </div>

            {formData.imca_appointed && (
              <div>
                <Label htmlFor="imca_details">IMCA Details</Label>
                <Textarea
                  id="imca_details"
                  value={formData.imca_details}
                  onChange={(e) => setFormData({ ...formData, imca_details: e.target.value })}
                  placeholder="IMCA name, organization, and contact details"
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save DoLS Authorization
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
