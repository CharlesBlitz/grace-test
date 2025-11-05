'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Users,
  Target,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Sparkles,
} from 'lucide-react';
import { getDomainIcon, getTaskTypeIcon, getDomainColors } from '@/lib/carePlanIcons';
import { VoiceDictation } from '@/components/VoiceDictation';
import { AISuggestionCard } from '@/components/AISuggestionCard';
import { AICarePlanAssistant } from '@/components/AICarePlanAssistant';
import {
  generateCareGoals,
  generateCareTasks,
  generateCarePlanDescription,
} from '@/lib/openaiCarePlanService';

interface Goal {
  name: string;
  description: string;
  category: string;
  priority: string;
  target_date: string;
}

interface Task {
  name: string;
  description: string;
  task_type: string;
  frequency: string;
  time_of_day: string;
  assigned_staff_id?: string;
}

interface Resident {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  room_number: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function CreateCarePlanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [organizationId, setOrganizationId] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const [formData, setFormData] = useState({
    resident_id: '',
    name: '',
    description: '',
    care_level: 'standard',
    start_date: new Date().toISOString().split('T')[0],
    review_date: '',
    coordinator_id: '',
  });

  const [goals, setGoals] = useState<Goal[]>([
    { name: '', description: '', category: 'health', priority: 'medium', target_date: '' }
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { name: '', description: '', task_type: 'medication', frequency: 'daily', time_of_day: '09:00' }
  ]);

  const [aiGoalSuggestions, setAiGoalSuggestions] = useState<Array<{ data: any; suggestionId: string }>>([]);
  const [aiTaskSuggestions, setAiTaskSuggestions] = useState<Array<{ data: any; suggestionId: string }>>([]);
  const [showAiGoalGenerator, setShowAiGoalGenerator] = useState(false);
  const [showAiTaskGenerator, setShowAiTaskGenerator] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

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
        .select('*')
        .eq('organization_id', orgUser.organization_id)
        .eq('status', 'active')
        .order('last_name');

      if (residentsData) {
        setResidents(residentsData);
      }

      const { data: staffData } = await supabase
        .from('organization_users')
        .select('*, users!inner(name)')
        .eq('organization_id', orgUser.organization_id)
        .eq('is_active', true)
        .in('role', ['nurse', 'care_coordinator', 'organization_admin']);

      if (staffData) {
        setStaffMembers(staffData.map((s: any) => ({
          id: s.user_id,
          user_id: s.user_id,
          first_name: s.users.name.split(' ')[0] || '',
          last_name: s.users.name.split(' ')[1] || '',
          role: s.role,
        })));
      }

      if (templateId) {
        await loadTemplate(templateId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load residents and staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (id: string) => {
    try {
      const { data: template } = await supabase
        .from('care_plan_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (template) {
        setFormData(prev => ({
          ...prev,
          name: template.name,
          description: template.description,
        }));

        if (template.default_goals && template.default_goals.length > 0) {
          setGoals(template.default_goals.map((g: any) => ({
            name: g.name,
            description: g.description || '',
            category: g.category,
            priority: g.priority,
            target_date: '',
          })));
        }

        if (template.default_tasks && template.default_tasks.length > 0) {
          setTasks(template.default_tasks.map((t: any) => ({
            name: t.name,
            description: t.description || '',
            task_type: t.type,
            frequency: t.frequency,
            time_of_day: '09:00',
          })));
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const addGoal = () => {
    setGoals([...goals, { name: '', description: '', category: 'health', priority: 'medium', target_date: '' }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: string, value: string) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
  };

  const addTask = () => {
    setTasks([...tasks, { name: '', description: '', task_type: 'medication', frequency: 'daily', time_of_day: '09:00' }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleSubmit = async () => {
    if (!formData.resident_id) {
      toast({
        title: 'Validation error',
        description: 'Please select a resident',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name) {
      toast({
        title: 'Validation error',
        description: 'Please provide a care plan name',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { data: carePlan, error: planError } = await supabase
        .from('care_plans')
        .insert({
          organization_id: organizationId,
          resident_id: formData.resident_id,
          name: formData.name,
          description: formData.description,
          care_level: formData.care_level,
          start_date: formData.start_date,
          review_date: formData.review_date || null,
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single();

      if (planError) throw planError;

      if (formData.coordinator_id) {
        await supabase.from('care_plan_staff_assignments').insert({
          care_plan_id: carePlan.id,
          user_id: formData.coordinator_id,
          role: 'coordinator',
          assigned_by: user?.id,
        });
      }

      const validGoals = goals.filter(g => g.name.trim() !== '');
      if (validGoals.length > 0) {
        await supabase.from('care_plan_goals').insert(
          validGoals.map((goal, index) => ({
            care_plan_id: carePlan.id,
            name: goal.name,
            description: goal.description,
            category: goal.category,
            priority: goal.priority,
            target_date: goal.target_date || null,
            order_index: index,
            status: 'active',
          }))
        );
      }

      const validTasks = tasks.filter(t => t.name.trim() !== '');
      if (validTasks.length > 0) {
        await supabase.from('care_plan_tasks').insert(
          validTasks.map((task, index) => ({
            care_plan_id: carePlan.id,
            name: task.name,
            description: task.description,
            task_type: task.task_type,
            frequency: task.frequency,
            time_of_day: task.time_of_day,
            assigned_staff_id: task.assigned_staff_id || null,
            order_index: index,
            is_active: true,
          }))
        );
      }

      await supabase.from('care_plan_history').insert({
        care_plan_id: carePlan.id,
        action: 'created',
        changed_by: user?.id,
        changes: {
          name: formData.name,
          goals_count: validGoals.length,
          tasks_count: validTasks.length,
        },
      });

      toast({
        title: 'Care plan created',
        description: 'The care plan has been successfully created',
      });

      router.push(`/organization/residents/${formData.resident_id}`);
    } catch (error: any) {
      console.error('Error creating care plan:', error);
      toast({
        title: 'Error creating care plan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateGoals = async () => {
    if (!user || !formData.resident_id) {
      toast({
        title: 'Please select a resident first',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingAi(true);
    try {
      const selectedResident = residents.find(r => r.id === formData.resident_id);
      const result = await generateCareGoals(
        {
          conditions: [],
          careLevel: formData.care_level,
          concerns: formData.description,
          organizationId,
        },
        user.id
      );

      setAiGoalSuggestions(result.goals.map(g => ({ data: g, suggestionId: result.suggestionId })));
    } catch (error) {
      console.error('Error generating goals:', error);
      toast({
        title: 'Failed to generate goals',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleGenerateTasks = async (goalIndex: number) => {
    if (!user) return;

    const goal = goals[goalIndex];
    if (!goal.name) {
      toast({
        title: 'Please enter a goal name first',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingAi(true);
    try {
      const result = await generateCareTasks(
        {
          goalName: goal.name,
          goalDescription: goal.description,
          goalCategory: goal.category,
          careLevel: formData.care_level,
          organizationId,
        },
        user.id
      );

      setAiTaskSuggestions(result.tasks.map(t => ({ data: t, suggestionId: result.suggestionId })));
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({
        title: 'Failed to generate tasks',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!user || !formData.resident_id) return;

    setGeneratingAi(true);
    try {
      const selectedResident = residents.find(r => r.id === formData.resident_id);
      const result = await generateCarePlanDescription(
        {
          residentName: `${selectedResident?.first_name} ${selectedResident?.last_name}`,
          conditions: [],
          careLevel: formData.care_level,
          concerns: formData.description,
          organizationId,
        },
        user.id
      );

      setFormData({ ...formData, description: result.description });
    } catch (error) {
      console.error('Error generating description:', error);
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="resident">Select Resident *</Label>
        <Select value={formData.resident_id} onValueChange={(v) => setFormData({ ...formData, resident_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a resident" />
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
        <Label htmlFor="name">Care Plan Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Dementia Care - Early Stage"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="description">Description</Label>
          <Button
            onClick={handleGenerateDescription}
            variant="outline"
            size="sm"
            disabled={!formData.resident_id || generatingAi}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </div>
        <VoiceDictation
          organizationId={organizationId}
          sectionType="care_plan_description"
          context={`Resident: ${residents.find(r => r.id === formData.resident_id)?.first_name || ''}, Care Level: ${formData.care_level}`}
          onTextGenerated={(text) => setFormData({ ...formData, description: text })}
          placeholder="Describe the overall goals and approach for this care plan"
        />
        {!formData.description && (
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Or type manually..."
            rows={4}
            className="mt-2"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="care_level">Care Level</Label>
          <Select value={formData.care_level} onValueChange={(v) => setFormData({ ...formData, care_level: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Care</SelectItem>
              <SelectItem value="enhanced">Enhanced Care</SelectItem>
              <SelectItem value="specialized">Specialized Care</SelectItem>
              <SelectItem value="intensive">Intensive Care</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="coordinator">Care Coordinator</Label>
          <Select value={formData.coordinator_id} onValueChange={(v) => setFormData({ ...formData, coordinator_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Assign coordinator" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.first_name} {staff.last_name} ({staff.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="review_date">Next Review Date</Label>
          <Input
            id="review_date"
            type="date"
            value={formData.review_date}
            onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Care Plan Goals</h3>
        <div className="flex gap-2">
          <Button onClick={handleGenerateGoals} variant="outline" size="sm" disabled={generatingAi}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
          <Button onClick={addGoal} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Manually
          </Button>
        </div>
      </div>

      {aiGoalSuggestions.length > 0 && (
        <div className="space-y-3">
          {aiGoalSuggestions.map((suggestion, idx) => (
            <AISuggestionCard
              key={idx}
              suggestionId={suggestion.suggestionId}
              suggestionType="goal"
              data={suggestion.data}
              onAccept={(editedData) => {
                setGoals([...goals, editedData || suggestion.data]);
                setAiGoalSuggestions(aiGoalSuggestions.filter((_, i) => i !== idx));
              }}
              onReject={() => {
                setAiGoalSuggestions(aiGoalSuggestions.filter((_, i) => i !== idx));
              }}
              onRegenerate={(newData, newSuggestionId) => {
                const updated = [...aiGoalSuggestions];
                updated[idx] = { data: newData, suggestionId: newSuggestionId };
                setAiGoalSuggestions(updated);
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {goals.map((goal, index) => {
          const DomainIcon = getDomainIcon(goal.category);
          const colors = getDomainColors(goal.category);
          return (
          <Card key={index} className={`border-l-4 ${colors.border}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Goal Name *</Label>
                      <Input
                        value={goal.name}
                        onChange={(e) => updateGoal(index, 'name', e.target.value)}
                        placeholder="e.g., Improve mobility and balance"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={goal.description}
                        onChange={(e) => updateGoal(index, 'description', e.target.value)}
                        placeholder="Detailed description of this goal"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <DomainIcon className={`h-4 w-4 ${colors.icon}`} />
                          Category
                        </Label>
                        <Select value={goal.category} onValueChange={(v) => updateGoal(index, 'category', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="health">🫀 Health</SelectItem>
                            <SelectItem value="cognitive">🧠 Cognitive</SelectItem>
                            <SelectItem value="mobility">👣 Mobility</SelectItem>
                            <SelectItem value="social">👥 Social</SelectItem>
                            <SelectItem value="nutrition">🍽️ Nutrition</SelectItem>
                            <SelectItem value="medication">💊 Medication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Priority</Label>
                        <Select value={goal.priority} onValueChange={(v) => updateGoal(index, 'priority', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Target Date</Label>
                        <Input
                          type="date"
                          value={goal.target_date}
                          onChange={(e) => updateGoal(index, 'target_date', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {goals.length > 1 && (
                    <Button onClick={() => removeGoal(index)} variant="ghost" size="icon" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Daily Care Tasks</h3>
        <div className="flex gap-2">
          {goals.length > 0 && goals[0].name && (
            <Button onClick={() => handleGenerateTasks(0)} variant="outline" size="sm" disabled={generatingAi}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate from Goals
            </Button>
          )}
          <Button onClick={addTask} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Manually
          </Button>
        </div>
      </div>

      {aiTaskSuggestions.length > 0 && (
        <div className="space-y-3">
          {aiTaskSuggestions.map((suggestion, idx) => (
            <AISuggestionCard
              key={idx}
              suggestionId={suggestion.suggestionId}
              suggestionType="task"
              data={suggestion.data}
              onAccept={(editedData) => {
                setTasks([...tasks, editedData || suggestion.data]);
                setAiTaskSuggestions(aiTaskSuggestions.filter((_, i) => i !== idx));
              }}
              onReject={() => {
                setAiTaskSuggestions(aiTaskSuggestions.filter((_, i) => i !== idx));
              }}
              onRegenerate={(newData, newSuggestionId) => {
                const updated = [...aiTaskSuggestions];
                updated[idx] = { data: newData, suggestionId: newSuggestionId };
                setAiTaskSuggestions(updated);
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task, index) => {
          const TaskIcon = getTaskTypeIcon(task.task_type);
          const colors = getDomainColors(task.task_type);
          return (
          <Card key={index} className={`border-l-4 ${colors.border}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Task Name *</Label>
                      <Input
                        value={task.name}
                        onChange={(e) => updateTask(index, 'name', e.target.value)}
                        placeholder="e.g., Morning medication"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={task.description}
                        onChange={(e) => updateTask(index, 'description', e.target.value)}
                        placeholder="Task instructions and notes"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <TaskIcon className={`h-4 w-4 ${colors.icon}`} />
                          Type
                        </Label>
                        <Select value={task.task_type} onValueChange={(v) => updateTask(index, 'task_type', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medication">💊 Medication</SelectItem>
                            <SelectItem value="hygiene">💧 Hygiene</SelectItem>
                            <SelectItem value="activity">⚡ Activity</SelectItem>
                            <SelectItem value="therapy">✨ Therapy</SelectItem>
                            <SelectItem value="assessment">🩺 Assessment</SelectItem>
                            <SelectItem value="nutrition">🍽️ Nutrition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Frequency</Label>
                        <Select value={task.frequency} onValueChange={(v) => updateTask(index, 'frequency', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="twice_daily">Twice Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Biweekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Time</Label>
                        <Input
                          type="time"
                          value={task.time_of_day}
                          onChange={(e) => updateTask(index, 'time_of_day', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Assign To</Label>
                        <Select
                          value={task.assigned_staff_id || ''}
                          onValueChange={(v) => updateTask(index, 'assigned_staff_id', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffMembers.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.first_name} {staff.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {tasks.length > 1 && (
                    <Button onClick={() => removeTask(index)} variant="ghost" size="icon" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Review Care Plan</h3>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Resident:</span>
            <span className="font-medium">
              {residents.find(r => r.id === formData.resident_id)?.first_name}{' '}
              {residents.find(r => r.id === formData.resident_id)?.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Care Plan Name:</span>
            <span className="font-medium">{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Care Level:</span>
            <Badge>{formData.care_level}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Start Date:</span>
            <span className="font-medium">{formData.start_date}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals ({goals.filter(g => g.name).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {goals.filter(g => g.name).map((goal, i) => {
              const DomainIcon = getDomainIcon(goal.category);
              const colors = getDomainColors(goal.category);
              return (
              <li key={i} className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg}`}>
                <DomainIcon className={`h-5 w-5 mt-0.5 ${colors.icon}`} />
                <div>
                  <div className="font-medium">{goal.name}</div>
                  <div className="text-sm text-gray-600">
                    <span className={`font-medium capitalize ${colors.text}`}>{goal.category}</span> • {goal.priority} priority
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.filter(t => t.name).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tasks.filter(t => t.name).map((task, i) => {
              const TaskIcon = getTaskTypeIcon(task.task_type);
              const colors = getDomainColors(task.task_type);
              return (
              <li key={i} className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg}`}>
                <TaskIcon className={`h-5 w-5 mt-0.5 ${colors.icon}`} />
                <div>
                  <div className="font-medium">{task.name}</div>
                  <div className="text-sm text-gray-600">
                    <span className={`font-medium capitalize ${colors.text}`}>{task.task_type}</span> • {task.frequency} • {task.time_of_day}
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const steps = [
    { number: 1, title: 'Basic Information', icon: FileText, render: renderStep1 },
    { number: 2, title: 'Goals', icon: Target, render: renderStep2 },
    { number: 3, title: 'Tasks', icon: ClipboardList, render: renderStep3 },
    { number: 4, title: 'Review', icon: CheckCircle2, render: renderStep4 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <AICarePlanAssistant
        organizationId={organizationId}
        context={`Creating care plan for ${residents.find(r => r.id === formData.resident_id)?.first_name || 'resident'}, Care Level: ${formData.care_level}`}
      />
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Care Plan</h1>
          <p className="text-gray-600">Design a personalized care plan for your resident</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      currentStep >= step.number
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle2 className="h-6 w-6" /> : <step.icon className="h-5 w-5" />}
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-600 text-center">{step.title}</div>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">{steps[currentStep - 1].render()}</CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Previous
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)} className="ml-auto">
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving} className="ml-auto">
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Care Plan
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
