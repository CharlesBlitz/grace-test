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
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  FileText,
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
} from 'lucide-react';

interface DecisionType {
  id: string;
  name: string;
  description: string;
  category: string;
  requires_specialist: boolean;
}

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  room_number: string;
}

export default function CreateMCAAssessmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const residentId = searchParams.get('resident');
  const carePlanId = searchParams.get('carePlan');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [decisionTypes, setDecisionTypes] = useState<DecisionType[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  const [formData, setFormData] = useState({
    resident_id: residentId || '',
    decision_type_id: '',
    decision_description: '',
    assessment_date: new Date().toISOString().split('T')[0],
    assessment_location: '',
    capacity_determination: 'pending',
    understand_information: null as boolean | null,
    retain_information: null as boolean | null,
    use_information: null as boolean | null,
    communicate_decision: null as boolean | null,
    evidence_notes: '',
    steps_taken_to_support: '',
    consultation_notes: '',
    assessment_outcome: '',
    next_review_date: '',
  });

  const [needsBestInterests, setNeedsBestInterests] = useState(false);
  const [bestInterestsData, setBestInterestsData] = useState({
    decision_description: '',
    family_consulted: false,
    family_views: '',
    advocate_involved: false,
    advocate_views: '',
    resident_wishes_known: '',
    beliefs_and_values: '',
    factors_considered: '',
    less_restrictive_options: '',
    decision_rationale: '',
  });

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

      const [typesResult, residentsResult] = await Promise.all([
        supabase
          .from('mca_decision_types')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('organization_residents')
          .select('id, first_name, last_name, room_number')
          .eq('organization_id', orgUser.organization_id)
          .eq('status', 'active')
          .order('last_name'),
      ]);

      if (typesResult.data) setDecisionTypes(typesResult.data);
      if (residentsResult.data) setResidents(residentsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load assessment types and residents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const allFourPrinciples = [
      formData.understand_information,
      formData.retain_information,
      formData.use_information,
      formData.communicate_decision,
    ];

    if (allFourPrinciples.every((p) => p !== null)) {
      const hasCapacity = allFourPrinciples.every((p) => p === true);
      setFormData((prev) => ({
        ...prev,
        capacity_determination: hasCapacity ? 'has_capacity' : 'lacks_capacity',
      }));
      setNeedsBestInterests(!hasCapacity);
    }
  }, [
    formData.understand_information,
    formData.retain_information,
    formData.use_information,
    formData.communicate_decision,
  ]);

  const handleSubmit = async () => {
    if (!formData.resident_id || !formData.decision_type_id || !formData.decision_description) {
      toast({
        title: 'Validation error',
        description: 'Please complete all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (
      formData.understand_information === null ||
      formData.retain_information === null ||
      formData.use_information === null ||
      formData.communicate_decision === null
    ) {
      toast({
        title: 'Validation error',
        description: 'Please complete all four capacity assessment questions',
        variant: 'destructive',
      });
      return;
    }

    if (needsBestInterests && !bestInterestsData.decision_rationale) {
      toast({
        title: 'Validation error',
        description: 'Best interests decision rationale is required when capacity is lacking',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from('mental_capacity_assessments')
        .insert({
          organization_id: organizationId,
          resident_id: formData.resident_id,
          care_plan_id: carePlanId || null,
          decision_type_id: formData.decision_type_id,
          decision_description: formData.decision_description,
          assessment_date: formData.assessment_date,
          assessed_by: user?.id,
          assessment_location: formData.assessment_location,
          has_capacity: formData.capacity_determination === 'has_capacity',
          capacity_determination: formData.capacity_determination,
          understand_information: formData.understand_information,
          retain_information: formData.retain_information,
          use_information: formData.use_information,
          communicate_decision: formData.communicate_decision,
          evidence_notes: formData.evidence_notes,
          steps_taken_to_support: formData.steps_taken_to_support,
          consultation_notes: formData.consultation_notes,
          assessment_outcome: formData.assessment_outcome,
          next_review_date: formData.next_review_date || null,
          status: 'completed',
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      if (needsBestInterests && assessment) {
        const { error: biError } = await supabase.from('best_interests_decisions').insert({
          mca_assessment_id: assessment.id,
          resident_id: formData.resident_id,
          decision_maker_id: user?.id,
          decision_description: bestInterestsData.decision_description,
          decision_date: new Date().toISOString().split('T')[0],
          family_consulted: bestInterestsData.family_consulted,
          family_views: bestInterestsData.family_views,
          advocate_involved: bestInterestsData.advocate_involved,
          advocate_views: bestInterestsData.advocate_views,
          resident_wishes_known: bestInterestsData.resident_wishes_known,
          beliefs_and_values: bestInterestsData.beliefs_and_values,
          factors_considered: bestInterestsData.factors_considered,
          less_restrictive_options: bestInterestsData.less_restrictive_options,
          decision_rationale: bestInterestsData.decision_rationale,
        });

        if (biError) throw biError;
      }

      toast({
        title: 'Assessment saved',
        description: 'Mental capacity assessment has been recorded successfully',
      });

      router.push(`/organization/mca?resident=${formData.resident_id}`);
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      toast({
        title: 'Error saving assessment',
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

  const categoryColors: Record<string, string> = {
    medical: 'bg-red-100 text-red-800',
    care: 'bg-blue-100 text-blue-800',
    financial: 'bg-green-100 text-green-800',
    personal: 'bg-amber-100 text-amber-800',
    accommodation: 'bg-cyan-100 text-cyan-800',
  };

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
            <Brain className="h-8 w-8 text-blue-600" />
            Mental Capacity Assessment
          </h1>
          <p className="text-gray-600 mt-2">
            Decision-specific capacity assessment under the Mental Capacity Act 2005
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
            <CardDescription>Basic information about this capacity assessment</CardDescription>
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
                <Label htmlFor="assessment_date">Assessment Date *</Label>
                <Input
                  id="assessment_date"
                  type="date"
                  value={formData.assessment_date}
                  onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="decision_type">Decision Type *</Label>
              <Select
                value={formData.decision_type_id}
                onValueChange={(v) => setFormData({ ...formData, decision_type_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type of decision" />
                </SelectTrigger>
                <SelectContent>
                  {decisionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            categoryColors[type.category] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {type.category}
                        </span>
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.decision_type_id && (
                <p className="text-sm text-gray-600 mt-1">
                  {decisionTypes.find((t) => t.id === formData.decision_type_id)?.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="decision_description">Specific Decision Being Assessed *</Label>
              <Textarea
                id="decision_description"
                value={formData.decision_description}
                onChange={(e) => setFormData({ ...formData, decision_description: e.target.value })}
                placeholder="Describe the specific decision to be made (e.g., 'Consent to undergo physiotherapy twice weekly for mobility improvement')"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="assessment_location">Assessment Location</Label>
              <Input
                id="assessment_location"
                value={formData.assessment_location}
                onChange={(e) => setFormData({ ...formData, assessment_location: e.target.value })}
                placeholder="e.g., Resident's room, Quiet lounge"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>The Four Key Questions (MCA Principles)</CardTitle>
            <CardDescription>
              Assess the person's ability to make this specific decision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                1. Can they UNDERSTAND the information relevant to the decision?
              </Label>
              <RadioGroup
                value={
                  formData.understand_information === null
                    ? ''
                    : formData.understand_information
                    ? 'yes'
                    : 'no'
                }
                onValueChange={(v) =>
                  setFormData({ ...formData, understand_information: v === 'yes' })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="understand-yes" />
                  <Label htmlFor="understand-yes">Yes - Can understand</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="understand-no" />
                  <Label htmlFor="understand-no">No - Cannot understand</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                2. Can they RETAIN the information long enough to make the decision?
              </Label>
              <RadioGroup
                value={
                  formData.retain_information === null
                    ? ''
                    : formData.retain_information
                    ? 'yes'
                    : 'no'
                }
                onValueChange={(v) =>
                  setFormData({ ...formData, retain_information: v === 'yes' })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="retain-yes" />
                  <Label htmlFor="retain-yes">Yes - Can retain information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="retain-no" />
                  <Label htmlFor="retain-no">No - Cannot retain information</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                3. Can they USE or WEIGH the information as part of the decision-making process?
              </Label>
              <RadioGroup
                value={
                  formData.use_information === null ? '' : formData.use_information ? 'yes' : 'no'
                }
                onValueChange={(v) =>
                  setFormData({ ...formData, use_information: v === 'yes' })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="use-yes" />
                  <Label htmlFor="use-yes">Yes - Can use/weigh information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="use-no" />
                  <Label htmlFor="use-no">No - Cannot use/weigh information</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                4. Can they COMMUNICATE their decision (by any means)?
              </Label>
              <RadioGroup
                value={
                  formData.communicate_decision === null
                    ? ''
                    : formData.communicate_decision
                    ? 'yes'
                    : 'no'
                }
                onValueChange={(v) =>
                  setFormData({ ...formData, communicate_decision: v === 'yes' })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="communicate-yes" />
                  <Label htmlFor="communicate-yes">Yes - Can communicate decision</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="communicate-no" />
                  <Label htmlFor="communicate-no">No - Cannot communicate decision</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.capacity_determination !== 'pending' && (
              <div
                className={`p-4 rounded-lg ${
                  formData.capacity_determination === 'has_capacity'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {formData.capacity_determination === 'has_capacity' ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Person HAS Capacity</p>
                        <p className="text-sm text-green-800">
                          Person can understand, retain, use and communicate - they have capacity for
                          this decision
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <p className="font-semibold text-red-900">Person LACKS Capacity</p>
                        <p className="text-sm text-red-800">
                          Person cannot meet all four criteria - best interests decision required
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Supporting Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="steps_taken">Steps Taken to Support Decision-Making</Label>
              <Textarea
                id="steps_taken"
                value={formData.steps_taken_to_support}
                onChange={(e) =>
                  setFormData({ ...formData, steps_taken_to_support: e.target.value })
                }
                placeholder="Describe what was done to help the person make the decision (simplified language, visual aids, best time of day, etc.)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="evidence_notes">Evidence and Clinical Notes</Label>
              <Textarea
                id="evidence_notes"
                value={formData.evidence_notes}
                onChange={(e) => setFormData({ ...formData, evidence_notes: e.target.value })}
                placeholder="Detailed evidence supporting your assessment, observations, specific examples"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="consultation_notes">Consultation with Others</Label>
              <Textarea
                id="consultation_notes"
                value={formData.consultation_notes}
                onChange={(e) => setFormData({ ...formData, consultation_notes: e.target.value })}
                placeholder="Notes from consultations with family, advocates, other professionals"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="assessment_outcome">Overall Assessment Outcome</Label>
              <Textarea
                id="assessment_outcome"
                value={formData.assessment_outcome}
                onChange={(e) => setFormData({ ...formData, assessment_outcome: e.target.value })}
                placeholder="Summary of assessment findings and conclusions"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="next_review_date">Next Review Date</Label>
              <Input
                id="next_review_date"
                type="date"
                value={formData.next_review_date}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
              />
              <p className="text-sm text-gray-600 mt-1">
                When should this assessment be reviewed? (consider if circumstances may change)
              </p>
            </div>
          </CardContent>
        </Card>

        {needsBestInterests && (
          <Card className="mb-6 border-amber-300">
            <CardHeader className="bg-amber-50">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                Best Interests Decision Required
              </CardTitle>
              <CardDescription>
                Since the person lacks capacity for this decision, a best interests decision must be
                recorded
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label htmlFor="bi_decision">What Decision Was Made? *</Label>
                <Textarea
                  id="bi_decision"
                  value={bestInterestsData.decision_description}
                  onChange={(e) =>
                    setBestInterestsData({ ...bestInterestsData, decision_description: e.target.value })
                  }
                  placeholder="Describe the decision that has been made in the person's best interests"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="family_consulted"
                    checked={bestInterestsData.family_consulted}
                    onCheckedChange={(checked) =>
                      setBestInterestsData({ ...bestInterestsData, family_consulted: !!checked })
                    }
                  />
                  <Label htmlFor="family_consulted">Family/Friends Consulted</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="advocate_involved"
                    checked={bestInterestsData.advocate_involved}
                    onCheckedChange={(checked) =>
                      setBestInterestsData({ ...bestInterestsData, advocate_involved: !!checked })
                    }
                  />
                  <Label htmlFor="advocate_involved">Independent Advocate Involved</Label>
                </div>
              </div>

              {bestInterestsData.family_consulted && (
                <div>
                  <Label htmlFor="family_views">Family/Friends Views</Label>
                  <Textarea
                    id="family_views"
                    value={bestInterestsData.family_views}
                    onChange={(e) =>
                      setBestInterestsData({ ...bestInterestsData, family_views: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              )}

              {bestInterestsData.advocate_involved && (
                <div>
                  <Label htmlFor="advocate_views">Advocate's Views</Label>
                  <Textarea
                    id="advocate_views"
                    value={bestInterestsData.advocate_views}
                    onChange={(e) =>
                      setBestInterestsData({ ...bestInterestsData, advocate_views: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="wishes_known">Person's Past and Present Wishes</Label>
                <Textarea
                  id="wishes_known"
                  value={bestInterestsData.resident_wishes_known}
                  onChange={(e) =>
                    setBestInterestsData({ ...bestInterestsData, resident_wishes_known: e.target.value })
                  }
                  placeholder="What is known about what the person would have wanted?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="beliefs">Beliefs and Values</Label>
                <Textarea
                  id="beliefs"
                  value={bestInterestsData.beliefs_and_values}
                  onChange={(e) =>
                    setBestInterestsData({ ...bestInterestsData, beliefs_and_values: e.target.value })
                  }
                  placeholder="Relevant beliefs, values, and cultural considerations"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="factors">All Factors Considered</Label>
                <Textarea
                  id="factors"
                  value={bestInterestsData.factors_considered}
                  onChange={(e) =>
                    setBestInterestsData({ ...bestInterestsData, factors_considered: e.target.value })
                  }
                  placeholder="All relevant factors that were taken into account"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="less_restrictive">Less Restrictive Options Considered</Label>
                <Textarea
                  id="less_restrictive"
                  value={bestInterestsData.less_restrictive_options}
                  onChange={(e) =>
                    setBestInterestsData({
                      ...bestInterestsData,
                      less_restrictive_options: e.target.value,
                    })
                  }
                  placeholder="What other less restrictive options were considered?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="rationale">Why This Decision is in Best Interests *</Label>
                <Textarea
                  id="rationale"
                  value={bestInterestsData.decision_rationale}
                  onChange={(e) =>
                    setBestInterestsData({ ...bestInterestsData, decision_rationale: e.target.value })
                  }
                  placeholder="Explain clearly why this decision is in the person's best interests"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

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
                Save Assessment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
