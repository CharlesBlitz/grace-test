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
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Save, ArrowLeft, Brain, Activity, Apple, User } from 'lucide-react';
import { AIAssessmentAnalysis } from '@/components/AIAssessmentAnalysis';

const ASSESSMENT_TYPES = [
  { value: 'cognitive', label: 'Cognitive Assessment', icon: Brain },
  { value: 'mobility', label: 'Mobility Assessment', icon: Activity },
  { value: 'nutrition', label: 'Nutrition Assessment', icon: Apple },
  { value: 'comprehensive', label: 'Comprehensive Review', icon: ClipboardList },
];

export default function ConductAssessment() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const carePlanId = searchParams.get('plan');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [carePlan, setCarePlan] = useState<any>(null);
  const [assessmentType, setAssessmentType] = useState('cognitive');
  const [assessmentData, setAssessmentData] = useState<any>({});
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (carePlanId) {
      loadCarePlan();
    } else {
      setLoading(false);
    }
  }, [user, carePlanId]);

  const loadCarePlan = async () => {
    try {
      const { data } = await supabase
        .from('care_plans')
        .select('*, organization_residents(*)')
        .eq('id', carePlanId)
        .single();

      if (data) {
        setCarePlan(data);
      }
    } catch (error) {
      console.error('Error loading care plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setAssessmentData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!carePlanId) {
      toast({
        title: 'Error',
        description: 'Care plan ID is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('care_plan_assessments').insert({
        care_plan_id: carePlanId,
        assessment_type: assessmentType,
        conducted_by: user?.id,
        assessment_data: assessmentData,
        notes,
        recommendations,
        status: 'completed',
      });

      if (error) throw error;

      await supabase.from('care_plan_history').insert({
        care_plan_id: carePlanId,
        action: 'assessment_completed',
        changed_by: user?.id,
        changes: {
          assessment_type: assessmentType,
          conducted_at: new Date().toISOString(),
        },
      });

      toast({
        title: 'Assessment saved',
        description: 'The assessment has been successfully recorded',
      });

      router.back();
    } catch (error: any) {
      toast({
        title: 'Error saving assessment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderCognitiveAssessment = () => (
    <div className="space-y-6">
      <div>
        <Label>Orientation to Time</Label>
        <RadioGroup value={assessmentData.orientation_time} onValueChange={(v) => updateField('orientation_time', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="full" id="time-full" />
            <Label htmlFor="time-full">Fully oriented</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="partial" id="time-partial" />
            <Label htmlFor="time-partial">Partially oriented</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disoriented" id="time-dis" />
            <Label htmlFor="time-dis">Disoriented</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Orientation to Place</Label>
        <RadioGroup value={assessmentData.orientation_place} onValueChange={(v) => updateField('orientation_place', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="full" id="place-full" />
            <Label htmlFor="place-full">Fully oriented</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="partial" id="place-partial" />
            <Label htmlFor="place-partial">Partially oriented</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disoriented" id="place-dis" />
            <Label htmlFor="place-dis">Disoriented</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Memory (Recent Events)</Label>
        <RadioGroup value={assessmentData.memory_recent} onValueChange={(v) => updateField('memory_recent', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="intact" id="memory-intact" />
            <Label htmlFor="memory-intact">Intact</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="impaired" id="memory-impaired" />
            <Label htmlFor="memory-impaired">Mildly impaired</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="severely_impaired" id="memory-severe" />
            <Label htmlFor="memory-severe">Severely impaired</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Attention Span</Label>
        <div className="space-y-2 mt-2">
          <Slider
            value={[assessmentData.attention_span || 5]}
            onValueChange={(v) => updateField('attention_span', v[0])}
            max={10}
            step={1}
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Poor (0)</span>
            <span>Score: {assessmentData.attention_span || 5}</span>
            <span>Excellent (10)</span>
          </div>
        </div>
      </div>

      <div>
        <Label>Communication Ability</Label>
        <RadioGroup value={assessmentData.communication} onValueChange={(v) => updateField('communication', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="clear" id="comm-clear" />
            <Label htmlFor="comm-clear">Clear and coherent</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="some_difficulty" id="comm-some" />
            <Label htmlFor="comm-some">Some difficulty</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="significant_difficulty" id="comm-sig" />
            <Label htmlFor="comm-sig">Significant difficulty</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Mood and Behaviour</Label>
        <Select value={assessmentData.mood} onValueChange={(v) => updateField('mood', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select mood state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calm_content">Calm and content</SelectItem>
            <SelectItem value="anxious">Anxious</SelectItem>
            <SelectItem value="agitated">Agitated</SelectItem>
            <SelectItem value="depressed">Depressed</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderMobilityAssessment = () => (
    <div className="space-y-6">
      <div>
        <Label>Ambulation Status</Label>
        <RadioGroup value={assessmentData.ambulation} onValueChange={(v) => updateField('ambulation', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="independent" id="amb-ind" />
            <Label htmlFor="amb-ind">Independent</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="assistance" id="amb-assist" />
            <Label htmlFor="amb-assist">Requires assistance</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="walker" id="amb-walker" />
            <Label htmlFor="amb-walker">Uses walker</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="wheelchair" id="amb-wheelchair" />
            <Label htmlFor="amb-wheelchair">Wheelchair bound</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bedbound" id="amb-bed" />
            <Label htmlFor="amb-bed">Bedbound</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Balance Assessment</Label>
        <div className="space-y-2 mt-2">
          <Slider
            value={[assessmentData.balance || 5]}
            onValueChange={(v) => updateField('balance', v[0])}
            max={10}
            step={1}
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Poor (0)</span>
            <span>Score: {assessmentData.balance || 5}</span>
            <span>Excellent (10)</span>
          </div>
        </div>
      </div>

      <div>
        <Label>Fall Risk Level</Label>
        <RadioGroup value={assessmentData.fall_risk} onValueChange={(v) => updateField('fall_risk', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="low" id="fall-low" />
            <Label htmlFor="fall-low">Low risk</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="medium" id="fall-medium" />
            <Label htmlFor="fall-medium">Medium risk</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="high" id="fall-high" />
            <Label htmlFor="fall-high">High risk</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Range of Motion</Label>
        <Select value={assessmentData.range_of_motion} onValueChange={(v) => updateField('range_of_motion', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select range of motion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full range in all joints</SelectItem>
            <SelectItem value="limited_upper">Limited upper body</SelectItem>
            <SelectItem value="limited_lower">Limited lower body</SelectItem>
            <SelectItem value="limited_both">Limited both</SelectItem>
            <SelectItem value="severely_limited">Severely limited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Gait Quality</Label>
        <RadioGroup value={assessmentData.gait} onValueChange={(v) => updateField('gait', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="steady" id="gait-steady" />
            <Label htmlFor="gait-steady">Steady and balanced</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unsteady" id="gait-unsteady" />
            <Label htmlFor="gait-unsteady">Unsteady</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="shuffling" id="gait-shuffle" />
            <Label htmlFor="gait-shuffle">Shuffling</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unable" id="gait-unable" />
            <Label htmlFor="gait-unable">Unable to walk</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Transfers (Bed to Chair)</Label>
        <RadioGroup value={assessmentData.transfers} onValueChange={(v) => updateField('transfers', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="independent" id="transfer-ind" />
            <Label htmlFor="transfer-ind">Independent</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="minimal_assist" id="transfer-min" />
            <Label htmlFor="transfer-min">Minimal assistance</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="moderate_assist" id="transfer-mod" />
            <Label htmlFor="transfer-mod">Moderate assistance</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="total_assist" id="transfer-total" />
            <Label htmlFor="transfer-total">Total assistance required</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderNutritionAssessment = () => (
    <div className="space-y-6">
      <div>
        <Label>Appetite Level</Label>
        <RadioGroup value={assessmentData.appetite} onValueChange={(v) => updateField('appetite', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="good" id="app-good" />
            <Label htmlFor="app-good">Good - Eats most meals</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fair" id="app-fair" />
            <Label htmlFor="app-fair">Fair - Eats about half</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="poor" id="app-poor" />
            <Label htmlFor="app-poor">Poor - Eats very little</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Hydration Status</Label>
        <RadioGroup value={assessmentData.hydration} onValueChange={(v) => updateField('hydration', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="adequate" id="hydration-adequate" />
            <Label htmlFor="hydration-adequate">Adequate fluid intake</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="borderline" id="hydration-border" />
            <Label htmlFor="hydration-border">Borderline</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dehydrated" id="hydration-dehydrated" />
            <Label htmlFor="hydration-dehydrated">Signs of dehydration</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Current Weight (lbs)</Label>
        <Input
          type="number"
          value={assessmentData.weight || ''}
          onChange={(e) => updateField('weight', e.target.value)}
          placeholder="Enter weight"
        />
      </div>

      <div>
        <Label>Weight Change from Last Assessment</Label>
        <RadioGroup value={assessmentData.weight_change} onValueChange={(v) => updateField('weight_change', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="stable" id="weight-stable" />
            <Label htmlFor="weight-stable">Stable (within 2 lbs)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="gain" id="weight-gain" />
            <Label htmlFor="weight-gain">Weight gain</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="loss" id="weight-loss" />
            <Label htmlFor="weight-loss">Weight loss</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Swallowing Ability</Label>
        <RadioGroup value={assessmentData.swallowing} onValueChange={(v) => updateField('swallowing', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="normal" id="swallow-normal" />
            <Label htmlFor="swallow-normal">Normal swallowing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="difficulty" id="swallow-diff" />
            <Label htmlFor="swallow-diff">Some difficulty</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="aspiration_risk" id="swallow-risk" />
            <Label htmlFor="swallow-risk">Aspiration risk</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Dietary Compliance</Label>
        <RadioGroup value={assessmentData.dietary_compliance} onValueChange={(v) => updateField('dietary_compliance', v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="compliant" id="diet-comp" />
            <Label htmlFor="diet-comp">Follows dietary guidelines</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sometimes" id="diet-sometimes" />
            <Label htmlFor="diet-sometimes">Sometimes non-compliant</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="non_compliant" id="diet-non" />
            <Label htmlFor="diet-non">Frequently non-compliant</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Special Dietary Needs</Label>
        <Textarea
          value={assessmentData.dietary_needs || ''}
          onChange={(e) => updateField('dietary_needs', e.target.value)}
          placeholder="Texture modifications, allergies, preferences..."
          rows={3}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Conduct Assessment</h1>
          {carePlan && (
            <p className="text-gray-600">
              For: {carePlan.organization_residents?.first_name} {carePlan.organization_residents?.last_name}
            </p>
          )}
        </div>

        <div className="mb-6">
          <Label>Assessment Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            {ASSESSMENT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all ${
                    assessmentType === type.value ? 'ring-2 ring-blue-600 border-blue-600' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setAssessmentType(type.value)}
                >
                  <CardContent className="pt-6 text-center">
                    <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm font-medium">{type.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Questions</CardTitle>
            <CardDescription>Complete the assessment based on current observations</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentType === 'cognitive' && renderCognitiveAssessment()}
            {assessmentType === 'mobility' && renderMobilityAssessment()}
            {assessmentType === 'nutrition' && renderNutritionAssessment()}
            {assessmentType === 'comprehensive' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Cognitive
                  </h3>
                  {renderCognitiveAssessment()}
                </div>
                <div className="border-t pt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Mobility
                  </h3>
                  {renderMobilityAssessment()}
                </div>
                <div className="border-t pt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Apple className="h-5 w-5" />
                    Nutrition
                  </h3>
                  {renderNutritionAssessment()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Assessment Notes and Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detailed observations and clinical notes..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Care plan adjustments, interventions, follow-up needed..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <AIAssessmentAnalysis
          assessmentType={assessmentType}
          assessmentData={assessmentData}
          notes={notes}
          organizationId={(carePlan as any)?.organization_id || ''}
          onApplyRecommendations={(recs) => setRecommendations(recs)}
        />

        <div className="flex justify-end gap-4 mt-6">
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
