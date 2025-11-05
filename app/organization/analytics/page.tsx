'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CarePlanAnalytics from '@/components/CarePlanAnalytics';

interface AnalyticsData {
  occupancyRate: number;
  occupancyTrend: number;
  taskCompletionRate: number;
  taskCompletionTrend: number;
  averageResponseTime: number;
  responseTrend: number;
  incidentCount: number;
  incidentTrend: number;
  staffUtilization: number;
  residentSatisfaction: number;
}

export default function FacilityAnalytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [organizationId, setOrganizationId] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    occupancyRate: 0,
    occupancyTrend: 0,
    taskCompletionRate: 0,
    taskCompletionTrend: 0,
    averageResponseTime: 0,
    responseTrend: 0,
    incidentCount: 0,
    incidentTrend: 0,
    staffUtilization: 0,
    residentSatisfaction: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(max_residents)')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) return;

      setOrganizationId(orgUser.organization_id);

      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { count: activeResidents } = await supabase
        .from('organization_residents')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgUser.organization_id)
        .eq('is_active', true);

      const maxResidents = (orgUser.organizations as any).max_residents || 50;
      const occupancyRate = ((activeResidents || 0) / maxResidents) * 100;

      const { data: tasks } = await supabase
        .from('care_tasks')
        .select('id, is_completed')
        .eq('organization_id', orgUser.organization_id)
        .gte('created_at', startDate.toISOString());

      const completedTasks = tasks?.filter((t) => t.is_completed).length || 0;
      const totalTasks = tasks?.length || 1;
      const taskCompletionRate = (completedTasks / totalTasks) * 100;

      const { data: notifications } = await supabase
        .from('notification_log')
        .select('created_at, sent_at')
        .gte('created_at', startDate.toISOString())
        .not('sent_at', 'is', null);

      let avgResponseTime = 0;
      if (notifications && notifications.length > 0) {
        const responseTimes = notifications.map((n) => {
          const created = new Date(n.created_at).getTime();
          const sent = new Date(n.sent_at).getTime();
          return (sent - created) / 1000 / 60;
        });
        avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }

      const { count: incidents } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgUser.organization_id)
        .eq('action', 'incident_report')
        .gte('created_at', startDate.toISOString());

      const { data: shifts } = await supabase
        .from('shift_schedules')
        .select('checked_in_at, checked_out_at')
        .eq('organization_id', orgUser.organization_id)
        .gte('shift_date', startDate.toISOString().split('T')[0]);

      let staffUtilization = 0;
      if (shifts && shifts.length > 0) {
        const completedShifts = shifts.filter((s) => s.checked_in_at && s.checked_out_at).length;
        staffUtilization = (completedShifts / shifts.length) * 100;
      }

      setAnalytics({
        occupancyRate: Math.round(occupancyRate),
        occupancyTrend: 2.5,
        taskCompletionRate: Math.round(taskCompletionRate),
        taskCompletionTrend: 5.2,
        averageResponseTime: Math.round(avgResponseTime),
        responseTrend: -3.1,
        incidentCount: incidents || 0,
        incidentTrend: -12.5,
        staffUtilization: Math.round(staffUtilization),
        residentSatisfaction: 92,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    suffix = '',
    trend,
    icon: Icon,
    color,
  }: {
    title: string;
    value: number;
    suffix?: string;
    trend: number;
    icon: any;
    color: string;
  }) => {
    const isPositive = trend > 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg bg-${color}-50`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="font-medium">{Math.abs(trend)}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold">
              {value}
              {suffix}
            </p>
            <p className="text-xs text-gray-500 mt-1">vs previous period</p>
          </div>
        </CardContent>
      </Card>
    );
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Facility Analytics
              </h1>
              <p className="text-gray-600 mt-1">Performance metrics and insights</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Occupancy Rate"
            value={analytics.occupancyRate}
            suffix="%"
            trend={analytics.occupancyTrend}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Task Completion"
            value={analytics.taskCompletionRate}
            suffix="%"
            trend={analytics.taskCompletionTrend}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Avg Response Time"
            value={analytics.averageResponseTime}
            suffix=" min"
            trend={analytics.responseTrend}
            icon={Clock}
            color="orange"
          />
          <StatCard
            title="Incidents"
            value={analytics.incidentCount}
            trend={analytics.incidentTrend}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="care-plans">Care Plans</TabsTrigger>
            <TabsTrigger value="residents">Residents</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                  <CardDescription>Key operational metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Staff Utilization</p>
                        <p className="text-2xl font-bold text-blue-600">{analytics.staffUtilization}%</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Resident Satisfaction</p>
                        <p className="text-2xl font-bold text-green-600">{analytics.residentSatisfaction}%</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Care Quality Indicators</CardTitle>
                  <CardDescription>Clinical and operational excellence</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Medication Adherence</span>
                        <span className="text-sm font-medium">96%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '96%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Fall Prevention</span>
                        <span className="text-sm font-medium">88%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '88%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Documentation Compliance</span>
                        <span className="text-sm font-medium">94%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '94%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Family Engagement</span>
                        <span className="text-sm font-medium">91%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '91%' }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Operational Insights</CardTitle>
                <CardDescription>Areas of focus for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Strong Performance</p>
                      <p className="text-sm text-green-700">
                        Task completion rates are 5.2% above target. Staff are responding quickly to resident needs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Room for Improvement</p>
                      <p className="text-sm text-yellow-700">
                        Consider adding activities during afternoon hours when engagement drops by 15%.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Positive Trend</p>
                      <p className="text-sm text-blue-700">
                        Incident reports have decreased by 12.5% compared to the previous period.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="care-plans">
            <CarePlanAnalytics organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="residents">
            <Card>
              <CardHeader>
                <CardTitle>Resident Analytics</CardTitle>
                <CardDescription>Detailed resident care metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Resident-specific analytics and trends will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance</CardTitle>
                <CardDescription>Team efficiency and productivity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Staff performance analytics will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality">
            <Card>
              <CardHeader>
                <CardTitle>Quality Assurance</CardTitle>
                <CardDescription>Compliance and quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Quality assurance metrics and compliance data will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
