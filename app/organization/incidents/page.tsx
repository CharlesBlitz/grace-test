'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
  Sparkles,
  Filter,
  Download,
  Eye,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getSeverityColor, getSeverityVariant, getCategoryDisplayName } from '@/lib/incidentDetector';

interface IncidentAlert {
  id: string;
  severity: string;
  categories: string[];
  detected_keywords: string[];
  created_at: string;
  resolved: boolean;
  first_acknowledged_at: string | null;
  staff_notified_count: number;
  resident_id: string;
  interaction_id: string;
  users: {
    name: string;
    avatar_url?: string;
  };
}

interface DashboardStats {
  activeIncidents: number;
  resolvedToday: number;
  criticalUnacknowledged: number;
  averageResponseTime: number;
}

export default function IncidentManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeIncidents: 0,
    resolvedToday: 0,
    criticalUnacknowledged: 0,
    averageResponseTime: 0,
  });
  const [incidents, setIncidents] = useState<IncidentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('active');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadIncidentData();
  }, [user, selectedTab, severityFilter]);

  const loadIncidentData = async () => {
    try {
      setLoading(true);

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

      let query = supabase
        .from('incident_alert_log')
        .select(`
          *,
          users!incident_alert_log_resident_id_fkey(name, avatar_url)
        `)
        .eq('organization_id', orgUser.organization_id)
        .order('created_at', { ascending: false });

      if (selectedTab === 'active') {
        query = query.eq('resolved', false);
      } else if (selectedTab === 'resolved') {
        query = query.eq('resolved', true);
      } else if (selectedTab === 'critical') {
        query = query.in('severity', ['critical', 'high']).eq('resolved', false);
      }

      if (severityFilter) {
        query = query.eq('severity', severityFilter);
      }

      const { data: incidentData } = await query.limit(50);

      setIncidents((incidentData as any[]) || []);

      const { count: activeCount } = await supabase
        .from('incident_alert_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgUser.organization_id)
        .eq('resolved', false);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: resolvedTodayCount } = await supabase
        .from('incident_alert_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgUser.organization_id)
        .eq('resolved', true)
        .gte('resolved_at', today.toISOString());

      const { count: criticalCount } = await supabase
        .from('incident_alert_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgUser.organization_id)
        .eq('severity', 'critical')
        .eq('resolved', false)
        .is('first_acknowledged_at', null);

      const { data: responseTimeData } = await supabase
        .from('incident_alert_log')
        .select('response_time_seconds')
        .eq('organization_id', orgUser.organization_id)
        .not('response_time_seconds', 'is', null)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const avgResponseTime =
        responseTimeData && responseTimeData.length > 0
          ? Math.round(
              responseTimeData.reduce((sum, item) => sum + (item.response_time_seconds || 0), 0) /
                responseTimeData.length
            )
          : 0;

      setStats({
        activeIncidents: activeCount || 0,
        resolvedToday: resolvedTodayCount || 0,
        criticalUnacknowledged: criticalCount || 0,
        averageResponseTime: avgResponseTime,
      });
    } catch (error) {
      console.error('Error loading incident data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (interactionId: string, residentId: string) => {
    if (!organizationId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-incident-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            interactionId,
            organizationId,
            residentId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        router.push(`/organization/documentation/review/${result.documentation.id}`);
      } else {
        alert(result.error || 'Failed to generate incident report');
      }
    } catch (error) {
      console.error('Error generating incident report:', error);
      alert('Failed to generate incident report');
    }
  };

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading incident management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                Incident Management
              </h1>
              <p className="text-slate-600">Monitor and respond to detected incidents</p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Active Incidents
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.activeIncidents}</div>
                <p className="text-xs text-slate-500 mt-1">Require attention</p>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Resolved Today
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.resolvedToday}</div>
                <p className="text-xs text-slate-500 mt-1">Successfully handled</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Critical Unacknowledged
                </CardTitle>
                <Bell className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats.criticalUnacknowledged}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.criticalUnacknowledged > 0 ? 'Urgent attention needed' : 'All acknowledged'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Avg Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {formatResponseTime(stats.averageResponseTime)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {stats.criticalUnacknowledged > 0 && (
          <Alert className="mb-6 border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Urgent:</strong> {stats.criticalUnacknowledged} critical incident(s) require
              immediate acknowledgment and response.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="active">
              Active ({stats.activeIncidents})
            </TabsTrigger>
            <TabsTrigger value="critical">
              Critical ({stats.criticalUnacknowledged})
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            {incidents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {selectedTab === 'active' ? 'No Active Incidents' : 'No Incidents Found'}
                  </h3>
                  <p className="text-slate-600">
                    {selectedTab === 'active'
                      ? 'All incidents have been resolved or there are no current concerns.'
                      : 'No incidents match the selected criteria.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <Card
                    key={incident.id}
                    className={`border-l-4 ${
                      incident.severity === 'critical'
                        ? 'border-l-red-600'
                        : incident.severity === 'high'
                        ? 'border-l-orange-600'
                        : incident.severity === 'medium'
                        ? 'border-l-yellow-600'
                        : 'border-l-blue-600'
                    }`}
                  >
                    <CardContent className="py-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant={getSeverityVariant(incident.severity as any)}>
                              {incident.severity.toUpperCase()}
                            </Badge>
                            {!incident.first_acknowledged_at && !incident.resolved && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                <Bell className="h-3 w-3 mr-1" />
                                Unacknowledged
                              </Badge>
                            )}
                            {incident.resolved && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {incident.users?.name || 'Unknown Resident'}
                          </h3>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {incident.categories?.map((category, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {getCategoryDisplayName(category)}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {incident.staff_notified_count} staff notified
                            </span>
                            {incident.first_acknowledged_at && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                Acknowledged
                              </span>
                            )}
                          </div>

                          {incident.detected_keywords && incident.detected_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {incident.detected_keywords.slice(0, 5).map((keyword, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleGenerateReport(incident.interaction_id, incident.resident_id)
                            }
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
