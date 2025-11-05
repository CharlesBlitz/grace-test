'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import {
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CarePlanMetrics {
  totalPlans: number;
  activePlans: number;
  completedGoals: number;
  totalGoals: number;
  todayTasksCompleted: number;
  todayTasksTotal: number;
  assessmentsDue: number;
  plansNeedingReview: number;
  goalsByCategory: Record<string, number>;
  tasksByType: Record<string, number>;
  recentAssessments: any[];
}

export default function CarePlanAnalytics({ organizationId }: { organizationId: string }) {
  const [metrics, setMetrics] = useState<CarePlanMetrics>({
    totalPlans: 0,
    activePlans: 0,
    completedGoals: 0,
    totalGoals: 0,
    todayTasksCompleted: 0,
    todayTasksTotal: 0,
    assessmentsDue: 0,
    plansNeedingReview: 0,
    goalsByCategory: {},
    tasksByType: {},
    recentAssessments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadMetrics();
    }
  }, [organizationId]);

  const loadMetrics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        plansResult,
        goalsResult,
        tasksResult,
        completionsResult,
        assessmentsResult,
        reviewsResult,
      ] = await Promise.all([
        supabase
          .from('care_plans')
          .select('id, status')
          .eq('organization_id', organizationId),

        supabase
          .from('care_plan_goals')
          .select('id, status, category, care_plans!inner(organization_id)')
          .eq('care_plans.organization_id', organizationId),

        supabase
          .from('care_plan_tasks')
          .select('id, task_type, care_plans!inner(organization_id)')
          .eq('care_plans.organization_id', organizationId)
          .eq('is_active', true),

        supabase
          .from('care_plan_task_completions')
          .select('id, care_plans!inner(organization_id)')
          .eq('care_plans.organization_id', organizationId)
          .gte('completed_at', today),

        supabase
          .from('care_plan_assessments')
          .select('*, care_plans!inner(organization_id, name, organization_residents(first_name, last_name))')
          .eq('care_plans.organization_id', organizationId)
          .order('conducted_at', { ascending: false })
          .limit(5),

        supabase
          .from('care_plans')
          .select('id, review_date')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .lte('review_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const plans = plansResult.data || [];
      const goals = goalsResult.data || [];
      const tasks = tasksResult.data || [];
      const completions = completionsResult.data || [];
      const assessments = assessmentsResult.data || [];
      const reviewsNeeded = reviewsResult.data || [];

      const goalsByCategory: Record<string, number> = {};
      goals.forEach((goal: any) => {
        goalsByCategory[goal.category] = (goalsByCategory[goal.category] || 0) + 1;
      });

      const tasksByType: Record<string, number> = {};
      tasks.forEach((task: any) => {
        tasksByType[task.task_type] = (tasksByType[task.task_type] || 0) + 1;
      });

      setMetrics({
        totalPlans: plans.length,
        activePlans: plans.filter((p: any) => p.status === 'active').length,
        completedGoals: goals.filter((g: any) => g.status === 'achieved').length,
        totalGoals: goals.length,
        todayTasksCompleted: completions.length,
        todayTasksTotal: tasks.length,
        assessmentsDue: 0,
        plansNeedingReview: reviewsNeeded.length,
        goalsByCategory,
        tasksByType,
        recentAssessments: assessments,
      });
    } catch (error) {
      console.error('Error loading care plan metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const goalCompletionRate =
    metrics.totalGoals > 0 ? Math.round((metrics.completedGoals / metrics.totalGoals) * 100) : 0;
  const taskCompletionRate =
    metrics.todayTasksTotal > 0
      ? Math.round((metrics.todayTasksCompleted / metrics.todayTasksTotal) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <Badge variant="secondary">{metrics.activePlans} active</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Care Plans</p>
              <p className="text-3xl font-bold">{metrics.totalPlans}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600">{goalCompletionRate}%</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Goals Achieved</p>
              <p className="text-3xl font-bold">
                {metrics.completedGoals}/{metrics.totalGoals}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-50">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-purple-600">{taskCompletionRate}%</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Tasks</p>
              <p className="text-3xl font-bold">
                {metrics.todayTasksCompleted}/{metrics.todayTasksTotal}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-50">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              {metrics.plansNeedingReview > 0 && (
                <Badge variant="destructive">{metrics.plansNeedingReview}</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Reviews Needed</p>
              <p className="text-3xl font-bold">{metrics.plansNeedingReview}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goals by Category</CardTitle>
            <CardDescription>Distribution of care plan goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.goalsByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(count / metrics.totalGoals) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              {Object.keys(metrics.goalsByCategory).length === 0 && (
                <p className="text-center text-gray-500 py-8">No goals data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Type</CardTitle>
            <CardDescription>Breakdown of daily care tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.tasksByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(count / metrics.todayTasksTotal) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              {Object.keys(metrics.tasksByType).length === 0 && (
                <p className="text-center text-gray-500 py-8">No tasks data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>Latest completed care plan assessments</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recentAssessments.length > 0 ? (
            <div className="space-y-4">
              {metrics.recentAssessments.map((assessment: any) => (
                <div key={assessment.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <Activity className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {assessment.care_plans?.organization_residents?.first_name}{' '}
                          {assessment.care_plans?.organization_residents?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assessment.assessment_type.replace('_', ' ')} Assessment
                        </p>
                      </div>
                      <Badge variant={assessment.status === 'completed' ? 'default' : 'secondary'}>
                        {assessment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(assessment.conducted_at).toLocaleDateString()} at{' '}
                      {new Date(assessment.conducted_at).toLocaleTimeString()}
                    </p>
                    {assessment.recommendations && (
                      <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border">
                        {assessment.recommendations}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent assessments</p>
          )}
        </CardContent>
      </Card>

      {metrics.plansNeedingReview > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800">
              {metrics.plansNeedingReview} care plan{metrics.plansNeedingReview > 1 ? 's need' : ' needs'}{' '}
              review within the next 7 days. Please schedule assessments and updates as needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
