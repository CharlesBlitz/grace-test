'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCog,
  Activity,
  AlertTriangle,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Bell,
  Settings,
  Building2,
  ClipboardList,
  FileText,
  Shield,
} from 'lucide-react';
import { getTodayInteractionCount } from '@/lib/interactionLogger';
import Link from 'next/link';
import NotificationCenter from '@/components/NotificationCenter';

interface OrganizationData {
  id: string;
  name: string;
  organization_type: string;
  subscription_tier: string;
  is_active: boolean;
}

interface DashboardStats {
  totalResidents: number;
  activeStaff: number;
  tasksToday: number;
  tasksCompleted: number;
  activeAlerts: number;
  shiftsToday: number;
  interactionsToday: number;
  pendingDocs: number;
  activeIncidents: number;
  criticalIncidents: number;
}

interface RecentActivity {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  user?: { name: string };
}

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalResidents: 0,
    activeStaff: 0,
    tasksToday: 0,
    tasksCompleted: 0,
    activeAlerts: 0,
    shiftsToday: 0,
    interactionsToday: 0,
    pendingDocs: 0,
    activeIncidents: 0,
    criticalIncidents: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(*)')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      setOrganization(orgUser.organizations as any);

      const [residentsData, staffData, tasksData, alertsData, shiftsData, activityData] = await Promise.all([
        supabase
          .from('organization_residents')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgUser.organization_id)
          .eq('is_active', true),

        supabase
          .from('organization_users')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgUser.organization_id)
          .eq('is_active', true),

        supabase
          .from('care_tasks')
          .select('id, is_completed', { count: 'exact' })
          .eq('organization_id', orgUser.organization_id)
          .gte('created_at', new Date().toISOString().split('T')[0]),

        supabase
          .from('care_tasks')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgUser.organization_id)
          .gte('reminder_attempts', 3)
          .eq('is_completed', false),

        supabase
          .from('shift_schedules')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgUser.organization_id)
          .eq('shift_date', new Date().toISOString().split('T')[0]),

        supabase
          .from('audit_logs')
          .select('id, action, resource_type, created_at, users!audit_logs_user_id_fkey(name)')
          .eq('organization_id', orgUser.organization_id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Get documentation stats
      const { count: interactionsCount } = await getTodayInteractionCount(orgUser.organization_id);
      const { count: pendingDocsCount } = await supabase
        .from('care_documentation')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgUser.organization_id)
        .eq('status', 'draft');

      // Get incident stats
      const { count: activeIncidentsCount } = await supabase
        .from('incident_alert_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgUser.organization_id)
        .eq('resolved', false);

      const { count: criticalIncidentsCount } = await supabase
        .from('incident_alert_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgUser.organization_id)
        .in('severity', ['critical', 'high'])
        .eq('resolved', false);

      setStats({
        totalResidents: residentsData.count || 0,
        activeStaff: staffData.count || 0,
        tasksToday: tasksData.count || 0,
        tasksCompleted: tasksData.data?.filter((t) => t.is_completed).length || 0,
        activeAlerts: alertsData.count || 0,
        shiftsToday: shiftsData.count || 0,
        interactionsToday: interactionsCount || 0,
        pendingDocs: pendingDocsCount || 0,
        activeIncidents: activeIncidentsCount || 0,
        criticalIncidents: criticalIncidentsCount || 0,
      });

      setRecentActivity((activityData.data as any) || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Residents',
      value: stats.totalResidents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+2 this week',
    },
    {
      title: 'Active Staff',
      value: stats.activeStaff,
      icon: UserCog,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: 'All shifts covered',
    },
    {
      title: 'Tasks Today',
      value: `${stats.tasksCompleted}/${stats.tasksToday}`,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: `${Math.round((stats.tasksCompleted / stats.tasksToday) * 100)}% complete`,
    },
    {
      title: 'Active Alerts',
      value: stats.activeAlerts,
      icon: AlertTriangle,
      color: stats.activeAlerts > 0 ? 'text-red-600' : 'text-gray-600',
      bgColor: stats.activeAlerts > 0 ? 'bg-red-50' : 'bg-gray-50',
      change: stats.activeAlerts > 0 ? 'Needs attention' : 'All clear',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                {organization.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {organization.organization_type.replace('_', ' ')} •{' '}
                <Badge variant="outline" className="ml-2">
                  {organization.subscription_tier}
                </Badge>
              </p>
            </div>
            <div className="flex gap-3">
              <NotificationCenter />
              <Button variant="outline" onClick={() => router.push('/organization/compliance')}>
                <Shield className="h-4 w-4 mr-2" />
                Compliance
              </Button>
              <Button variant="outline" onClick={() => router.push('/organization/incidents')}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Incidents
              </Button>
              <Button variant="outline" onClick={() => router.push('/organization/documentation')}>
                <FileText className="h-4 w-4 mr-2" />
                Documentation
              </Button>
              <Button variant="outline" onClick={() => router.push('/organization/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button onClick={() => router.push('/organization/residents/add')}>
                <Users className="h-4 w-4 mr-2" />
                Add Resident
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold mb-1">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="residents">Residents</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                  <CardDescription>Staff shifts and coverage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Day Shift</p>
                          <p className="text-sm text-gray-600">7:00 AM - 3:00 PM</p>
                        </div>
                      </div>
                      <Badge>8 staff</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Evening Shift</p>
                          <p className="text-sm text-gray-600">3:00 PM - 11:00 PM</p>
                        </div>
                      </div>
                      <Badge>6 staff</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Night Shift</p>
                          <p className="text-sm text-gray-600">11:00 PM - 7:00 AM</p>
                        </div>
                      </div>
                      <Badge>4 staff</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/organization/schedules')}>
                    View Full Schedule
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alerts & Notifications</CardTitle>
                  <CardDescription>Items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.activeAlerts > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">Missed Medication Reminders</p>
                          <p className="text-sm text-red-700">3 residents have missed medication reminders</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-900">Upcoming Assessments</p>
                          <p className="text-sm text-yellow-700">5 resident assessments due this week</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Schedule
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                      <p className="font-medium text-gray-900">All Clear!</p>
                      <p className="text-sm text-gray-600 mt-1">No alerts at this time</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              {stats.activeIncidents > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <AlertTriangle className="h-5 w-5" />
                      Incident Alerts
                    </CardTitle>
                    <CardDescription className="text-red-700">
                      Active incidents requiring attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-800">Active Incidents:</span>
                        <Badge className="bg-red-600 text-white">
                          {stats.activeIncidents} total
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-800">Critical/High:</span>
                        <Badge variant={stats.criticalIncidents > 0 ? 'destructive' : 'outline'}>
                          {stats.criticalIncidents} urgent
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-red-200">
                        <span className="text-sm font-medium text-red-900">Status:</span>
                        <span className="text-sm font-bold text-red-900">
                          {stats.criticalIncidents > 0 ? 'Urgent Action Required' : 'Review Needed'}
                        </span>
                      </div>
                    </div>
                    <Link href="/organization/incidents">
                      <Button className="w-full mt-4 bg-red-600 hover:bg-red-700">
                        View Incident Dashboard
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <FileText className="h-5 w-5" />
                    Care Documentation
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    AI-powered documentation from interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Today's Interactions:</span>
                      <Badge className="bg-blue-600 text-white">
                        {stats.interactionsToday} captured
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Pending Reviews:</span>
                      <Badge variant={stats.pendingDocs > 0 ? 'destructive' : 'outline'}>
                        {stats.pendingDocs} pending
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                      <span className="text-sm font-medium text-blue-900">Documentation Coverage:</span>
                      <span className="text-sm font-bold text-blue-900">
                        {stats.interactionsToday > 0 ? '100%' : '0%'}
                      </span>
                    </div>
                  </div>
                  <Link href="/organization/documentation">
                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                      View Documentation Dashboard
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Links
                  </CardTitle>
                  <CardDescription>Common actions and pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => router.push('/organization/residents')} className="justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Residents
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/organization/staff')} className="justify-start">
                      <UserCog className="h-4 w-4 mr-2" />
                      Staff
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/organization/care-plans')} className="justify-start">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Care Plans
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/organization/analytics')} className="justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions in your facility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                      <Activity className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-gray-600">
                          {activity.resource_type} • {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">{activity.user?.name || 'System'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="residents">
            <Card>
              <CardHeader>
                <CardTitle>Resident Management</CardTitle>
                <CardDescription>View and manage all facility residents</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/organization/residents')}>View All Residents</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Manage your care team</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/organization/staff')}>View All Staff</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Complete audit trail of all actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/organization/audit')}>View Full Audit Log</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
