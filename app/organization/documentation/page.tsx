'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MessageSquare,
  Users,
  Download,
  ArrowRight,
  Sparkles,
  Eye,
  BarChart3,
} from 'lucide-react';
import {
  getOrganizationInteractions,
  getTodayInteractionCount,
  getInteractionStats,
  InteractionLogEntry,
} from '@/lib/interactionLogger';
import { formatDistanceToNow } from 'date-fns';

interface OrganizationData {
  id: string;
  name: string;
  organization_type: string;
}

interface DashboardStats {
  todayInteractions: number;
  pendingReviews: number;
  documentedToday: number;
  flaggedConcerns: number;
}

export default function DocumentationDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayInteractions: 0,
    pendingReviews: 0,
    documentedToday: 0,
    flaggedConcerns: 0,
  });
  const [recentInteractions, setRecentInteractions] = useState<any[]>([]);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
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

      const orgId = orgUser.organization_id;

      // Get today's interaction count
      const { count: todayCount } = await getTodayInteractionCount(orgId);

      // Get recent interactions
      const { data: interactions } = await getOrganizationInteractions(orgId, {
        limit: 10,
      });

      // Get interactions with concerns
      const { data: concernInteractions } = await supabase
        .from('care_interaction_logs')
        .select('id')
        .eq('organization_id', orgId)
        .not('detected_concerns', 'eq', '{}')
        .gte('interaction_start', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      // Get documentation generated today
      const { count: docCount } = await supabase
        .from('care_documentation')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('document_date', new Date().toISOString().split('T')[0]);

      // Get pending reviews (draft documentation)
      const { count: pendingCount } = await supabase
        .from('care_documentation')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'draft');

      setStats({
        todayInteractions: todayCount || 0,
        pendingReviews: pendingCount || 0,
        documentedToday: docCount || 0,
        flaggedConcerns: concernInteractions?.length || 0,
      });

      setRecentInteractions(interactions || []);

      const { data: notes } = await supabase
        .from('care_documentation')
        .select(`
          *,
          users!care_documentation_resident_id_fkey(name, avatar_url)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentNotes(notes || []);
    } catch (error) {
      console.error('Error loading documentation dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return <MessageSquare className="h-4 w-4" />;
      case 'reminder_response':
        return <Clock className="h-4 w-4" />;
      case 'wellness_check':
        return <Activity className="h-4 w-4" />;
      case 'incident':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'incident':
        return 'text-red-600 bg-red-50';
      case 'wellness_check':
        return 'text-green-600 bg-green-50';
      case 'conversation':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading documentation dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Care Documentation</h1>
              <p className="text-slate-600">
                AI-powered documentation from resident interactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/organization/documentation/performance')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance
              </Button>
              <Button onClick={() => router.push('/organization/documentation/export')}>
                <Download className="h-4 w-4 mr-2" />
                Export Reports
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Interactions Today
              </CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.todayInteractions}</div>
              <p className="text-xs text-slate-500 mt-1">Captured automatically</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pending Reviews
              </CardTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.pendingReviews}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.pendingReviews > 0 ? 'Needs attention' : 'All up to date'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Documented Today
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.documentedToday}</div>
              <p className="text-xs text-slate-500 mt-1">Auto-generated notes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Flagged Concerns
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.flaggedConcerns}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.flaggedConcerns > 0 ? 'Requires review' : 'No concerns'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Interactions
              </CardTitle>
              <CardDescription>
                Latest captured interactions from residents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentInteractions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-2">No interactions captured yet</p>
                  <p className="text-sm text-slate-400">
                    Interactions from voice conversations and reminders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentInteractions.map((interaction: any) => (
                    <div
                      key={interaction.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getInteractionColor(interaction.interaction_type)}`}>
                        {getInteractionIcon(interaction.interaction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="font-medium text-slate-900">
                              {interaction.users?.name || 'Unknown Resident'}
                            </p>
                            <p className="text-sm text-slate-500 capitalize">
                              {interaction.interaction_type.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {formatDistanceToNow(new Date(interaction.interaction_start), {
                                addSuffix: true,
                              })}
                            </Badge>
                            {interaction.detected_concerns?.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Concern
                              </Badge>
                            )}
                          </div>
                        </div>
                        {interaction.raw_transcript && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {interaction.raw_transcript}
                          </p>
                        )}
                        {interaction.duration_seconds && (
                          <p className="text-xs text-slate-400 mt-1">
                            Duration: {Math.floor(interaction.duration_seconds / 60)}m{' '}
                            {interaction.duration_seconds % 60}s
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={() => router.push('/organization/documentation/generate')}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Daily Notes
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={() => router.push('/organization/documentation?tab=pending')}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Reviews ({stats.pendingReviews})
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" disabled>
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Wellness Summaries
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" disabled>
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Reports
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Daily Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {recentNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-3">No notes generated yet</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push('/organization/documentation/generate')}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate First Note
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentNotes.map((note: any) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                        onClick={() => router.push(`/organization/documentation/review/${note.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-900">
                            {note.users?.name || 'Unknown Resident'}
                          </p>
                          <Badge variant={note.status === 'draft' ? 'secondary' : 'default'}>
                            {note.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(note.document_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push('/organization/documentation/notes')}
                    >
                      View All Notes
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                  <Sparkles className="h-5 w-5" />
                  Now Live!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                    <span>AI-generated daily care notes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                    <span>Staff review and approval workflow</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Automatic incident detection (Coming Soon)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Weekly wellness summaries (Coming Soon)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
