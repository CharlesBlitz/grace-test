'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, FileText, MapPin, Clock, AlertCircle, CheckCircle2, Plus, Bell, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';

export default function GraceNotesDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    visitsToday: 0,
    pendingNotes: 0,
    overdueAssessments: 0,
    tasksToday: 0,
  });
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/grace-notes/login');
      return;
    }
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      const { data: practitionerData } = await supabase
        .from('grace_notes_practitioners')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!practitionerData) {
        router.push('/grace-notes/register');
        return;
      }

      setPractitioner(practitionerData);

      const { data: clients } = await supabase
        .from('grace_notes_clients')
        .select('*')
        .eq('practitioner_id', practitionerData.id);

      const activeClients = clients?.filter(c => c.status === 'active') || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: visits } = await supabase
        .from('grace_notes_visits')
        .select('*, client:grace_notes_clients(*)')
        .eq('practitioner_id', practitionerData.id)
        .gte('scheduled_start', today.toISOString())
        .lt('scheduled_start', tomorrow.toISOString())
        .order('scheduled_start', { ascending: true });

      const { data: upcomingVisitsData } = await supabase
        .from('grace_notes_visits')
        .select('*, client:grace_notes_clients(*)')
        .eq('practitioner_id', practitionerData.id)
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(5);

      const { data: pendingVisitNotes } = await supabase
        .from('grace_notes_visit_notes')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .eq('status', 'draft');

      const { data: assessments } = await supabase
        .from('grace_notes_assessments')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .lt('review_date', new Date().toISOString())
        .eq('status', 'completed');

      const { data: tasks } = await supabase
        .from('grace_notes_tasks')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .eq('due_date', today.toISOString().split('T')[0])
        .eq('status', 'pending');

      setStats({
        totalClients: clients?.length || 0,
        activeClients: activeClients.length,
        visitsToday: visits?.length || 0,
        pendingNotes: pendingVisitNotes?.length || 0,
        overdueAssessments: assessments?.length || 0,
        tasksToday: tasks?.length || 0,
      });

      setUpcomingVisits(upcomingVisitsData || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back, {practitioner?.professional_title}
              </h1>
              <p className="text-slate-600 mt-1">
                Here's your practice overview for today
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <Badge variant="outline" className="px-3 py-1">
                {practitioner?.subscription_plan}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClients}</div>
              <p className="text-xs text-slate-500">
                of {stats.totalClients} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visits Today</CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.visitsToday}</div>
              <p className="text-xs text-slate-500">
                scheduled appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Notes</CardTitle>
              <FileText className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingNotes}</div>
              <p className="text-xs text-slate-500">
                require completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasksToday}</div>
              <p className="text-xs text-slate-500">
                due today
              </p>
            </CardContent>
          </Card>
        </div>

        {stats.overdueAssessments > 0 && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-amber-900">Action Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-amber-800">
                You have {stats.overdueAssessments} assessment(s) due for review.
              </p>
              <Link href="/grace-notes/assessments">
                <Button className="mt-4 bg-amber-600 hover:bg-amber-700">
                  Review Assessments
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Visits</CardTitle>
                <Link href="/grace-notes/visits/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New Visit
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingVisits.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No upcoming visits scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingVisits.map((visit) => (
                    <Link
                      key={visit.id}
                      href={`/grace-notes/visits/${visit.id}`}
                      className="block p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {visit.client.first_name} {visit.client.last_name}
                          </p>
                          <p className="text-sm text-slate-600 capitalize">{visit.visit_type}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {visit.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(visit.scheduled_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(visit.scheduled_start).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/grace-notes/clients/new">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                    <Users className="w-6 h-6" />
                    <span>Add Client</span>
                  </Button>
                </Link>
                <Link href="/grace-notes/visits/new">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                    <MapPin className="w-6 h-6" />
                    <span>Schedule Visit</span>
                  </Button>
                </Link>
                <Link href="/grace-notes/assessments/new">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                    <FileText className="w-6 h-6" />
                    <span>New Assessment</span>
                  </Button>
                </Link>
                <Link href="/grace-notes/notes/capture">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <FileText className="w-6 h-6" />
                    <span>Capture Note</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Caseload Overview</CardTitle>
            <CardDescription>Your active clients and their care status</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Clients</TabsTrigger>
                <TabsTrigger value="high-risk">High Risk</TabsTrigger>
                <TabsTrigger value="overdue">Reviews Due</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-6">
                <div className="text-center py-8 text-slate-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>Client list will appear here</p>
                  <Link href="/grace-notes/clients">
                    <Button variant="link" className="mt-2">
                      View all clients
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
