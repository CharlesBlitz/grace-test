'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import {
  FileText,
  Target,
  ClipboardList,
  Calendar,
  User,
  TrendingUp,
  Plus,
  Eye,
  Edit,
} from 'lucide-react';
import { getDomainIcon, getTaskTypeIcon, getDomainColors } from '@/lib/carePlanIcons';
import Link from 'next/link';

interface CarePlan {
  id: string;
  name: string;
  description: string;
  care_level: string;
  status: string;
  start_date: string;
  review_date: string;
  created_at: string;
  goals_count?: number;
  tasks_count?: number;
  completed_tasks_count?: number;
  coordinator?: {
    name: string;
  };
}

interface Goal {
  id: string;
  name: string;
  category: string;
  priority: string;
  status: string;
  progress_percentage: number;
}

interface Task {
  id: string;
  name: string;
  task_type: string;
  frequency: string;
  time_of_day: string;
  is_active: boolean;
  completions_today?: number;
}

export default function ResidentCarePlans({ residentId }: { residentId: string }) {
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CarePlan | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarePlans();
  }, [residentId]);

  useEffect(() => {
    if (selectedPlan) {
      loadPlanDetails(selectedPlan.id);
    }
  }, [selectedPlan]);

  const loadCarePlans = async () => {
    try {
      const { data: plans } = await supabase
        .from('care_plans')
        .select(`
          *,
          care_plan_staff_assignments!inner(
            user_id,
            users(name)
          )
        `)
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false });

      if (plans && plans.length > 0) {
        const plansWithCounts = await Promise.all(
          plans.map(async (plan) => {
            const [goalsResult, tasksResult, completionsResult] = await Promise.all([
              supabase.from('care_plan_goals').select('id', { count: 'exact', head: true }).eq('care_plan_id', plan.id),
              supabase.from('care_plan_tasks').select('id', { count: 'exact', head: true }).eq('care_plan_id', plan.id),
              supabase
                .from('care_plan_task_completions')
                .select('id', { count: 'exact', head: true })
                .eq('care_plan_id', plan.id)
                .gte('completed_at', new Date().toISOString().split('T')[0]),
            ]);

            const coordinator = Array.isArray(plan.care_plan_staff_assignments)
              ? plan.care_plan_staff_assignments.find((a: any) => a.role === 'coordinator')
              : null;

            return {
              ...plan,
              goals_count: goalsResult.count || 0,
              tasks_count: tasksResult.count || 0,
              completed_tasks_count: completionsResult.count || 0,
              coordinator: coordinator?.users,
            };
          })
        );

        setCarePlans(plansWithCounts);
        setSelectedPlan(plansWithCounts.find((p) => p.status === 'active') || plansWithCounts[0]);
      }
    } catch (error) {
      console.error('Error loading care plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanDetails = async (planId: string) => {
    try {
      const [goalsData, tasksData] = await Promise.all([
        supabase.from('care_plan_goals').select('*').eq('care_plan_id', planId).order('order_index'),
        supabase.from('care_plan_tasks').select('*').eq('care_plan_id', planId).eq('is_active', true).order('order_index'),
      ]);

      setGoals(goalsData.data || []);
      setTasks(tasksData.data || []);
    } catch (error) {
      console.error('Error loading plan details:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (carePlans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Care Plans Yet</h3>
            <p className="text-gray-600 mb-6">Create a personalised care plan to get started</p>
            <Link href={`/organization/care-plans/create?resident=${residentId}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Care Plan
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Care Plans</h2>
          <p className="text-gray-600">Manage and track resident care plans</p>
        </div>
        <Link href={`/organization/care-plans/create?resident=${residentId}`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Care Plan
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">All Care Plans</h3>
          {carePlans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all ${
                selectedPlan?.id === plan.id ? 'ring-2 ring-blue-600 border-blue-600' : 'hover:border-gray-400'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge className={getStatusColor(plan.status)}>{plan.status.replace('_', ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Started {new Date(plan.start_date).toLocaleDateString()}
                  </div>
                  {plan.coordinator && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4" />
                      {plan.coordinator.name}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{plan.goals_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{plan.tasks_count || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPlan && (
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedPlan.name}</CardTitle>
                    <CardDescription>{selectedPlan.description}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Care Level</p>
                    <Badge>{selectedPlan.care_level}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Next Review</p>
                    <p className="font-medium">
                      {selectedPlan.review_date ? new Date(selectedPlan.review_date).toLocaleDateString() : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                {selectedPlan.tasks_count && selectedPlan.tasks_count > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Today's Progress</p>
                      <p className="text-sm text-gray-600">
                        {selectedPlan.completed_tasks_count || 0} of {selectedPlan.tasks_count} tasks
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${((selectedPlan.completed_tasks_count || 0) / selectedPlan.tasks_count) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Care Goals ({goals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goals.length > 0 ? (
                  <div className="space-y-4">
                    {goals.map((goal) => {
                      const DomainIcon = getDomainIcon(goal.category);
                      const colors = getDomainColors(goal.category);
                      return (
                      <div key={goal.id} className={`p-4 rounded-lg border-l-4 ${colors.bg} ${colors.border}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <DomainIcon className={`h-5 w-5 ${colors.icon}`} />
                              <p className="font-medium">{goal.name}</p>
                              <Badge className={getPriorityColor(goal.priority)} variant="outline">
                                {goal.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${colors.text} capitalize`}>{goal.category}</span>
                            </div>
                          </div>
                          <Badge variant={goal.status === 'achieved' ? 'default' : 'secondary'}>{goal.status}</Badge>
                        </div>
                        {goal.progress_percentage > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Progress</span>
                              <span className="text-xs font-medium">{goal.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-blue-600 h-1 rounded-full transition-all"
                                style={{ width: `${goal.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No goals defined</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Care Tasks ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const TaskIcon = getTaskTypeIcon(task.task_type);
                      const colors = getDomainColors(task.task_type);
                      return (
                      <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center gap-3">
                          <TaskIcon className={`h-5 w-5 ${colors.icon}`} />
                          <div>
                            <p className="font-medium">{task.name}</p>
                            <p className="text-sm text-gray-600">
                              <span className={`font-medium capitalize ${colors.text}`}>{task.task_type}</span> • {task.frequency} • {task.time_of_day}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{task.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No tasks defined</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
