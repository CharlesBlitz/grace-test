'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Heart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Activity,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ResidentWellness {
  resident_id: string;
  resident_name: string;
  latest_score: number;
  trend: string;
  alert_count: number;
  check_in_rate: number;
}

interface Alert {
  id: string;
  title: string;
  severity: string;
  resident_name: string;
  detected_at: string;
  status: string;
}

export default function OrganizationWellnessAnalyticsPage() {
  const { profile } = useAuth();
  const [residents, setResidents] = useState<ResidentWellness[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({
    totalResidents: 0,
    avgWellnessScore: 0,
    activeAlerts: 0,
    trendsImproving: 0,
    trendsDeclining: 0,
    avgCheckInRate: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      loadAnalytics();
    }
  }, [profile, timeRange]);

  const loadAnalytics = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', profile?.id)
        .single();

      if (!orgUser) {
        setLoading(false);
        return;
      }

      const { data: orgResidents } = await supabase
        .from('organization_residents')
        .select('user_id, users(id, name)')
        .eq('organization_id', orgUser.organization_id);

      if (!orgResidents) {
        setLoading(false);
        return;
      }

      const residentIds = orgResidents.map(r => r.user_id);

      const [summariesData, alertsData] = await Promise.all([
        supabase
          .from('wellness_summaries')
          .select('*')
          .in('elder_id', residentIds)
          .order('generated_at', { ascending: false }),
        supabase
          .from('wellness_alerts')
          .select('*, users!wellness_alerts_elder_id_fkey(name)')
          .in('elder_id', residentIds)
          .in('status', ['active', 'acknowledged'])
          .order('detected_at', { ascending: false })
      ]);

      const residentWellnessMap = new Map<string, ResidentWellness>();

      orgResidents.forEach(resident => {
        const residentSummaries = summariesData.data?.filter(
          s => s.elder_id === resident.user_id
        ) || [];

        const latestSummary = residentSummaries[0];
        const residentAlerts = alertsData.data?.filter(
          a => a.elder_id === resident.user_id
        ) || [];

        if (latestSummary) {
          residentWellnessMap.set(resident.user_id, {
            resident_id: resident.user_id,
            resident_name: (resident.users as any)?.name || 'Unknown',
            latest_score: latestSummary.overall_wellness_score,
            trend: latestSummary.wellness_trend,
            alert_count: residentAlerts.length,
            check_in_rate: latestSummary.check_in_completion_rate,
          });
        }
      });

      const residentsList = Array.from(residentWellnessMap.values());
      setResidents(residentsList);

      const formattedAlerts: Alert[] = alertsData.data?.map(alert => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        resident_name: (alert.users as any)?.name || 'Unknown',
        detected_at: alert.detected_at,
        status: alert.status,
      })) || [];

      setAlerts(formattedAlerts);

      const avgScore = residentsList.length > 0
        ? Math.round(residentsList.reduce((sum, r) => sum + r.latest_score, 0) / residentsList.length)
        : 0;

      const avgCheckIn = residentsList.length > 0
        ? Math.round(residentsList.reduce((sum, r) => sum + r.check_in_rate, 0) / residentsList.length)
        : 0;

      const improving = residentsList.filter(r => r.trend === 'improving').length;
      const declining = residentsList.filter(r => r.trend === 'declining').length;

      setStats({
        totalResidents: residentsList.length,
        avgWellnessScore: avgScore,
        activeAlerts: formattedAlerts.length,
        trendsImproving: improving,
        trendsDeclining: declining,
        avgCheckInRate: avgCheckIn,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-mint-green/20 text-mint-green border-mint-green';
      case 'declining':
        return 'bg-coral-red/20 text-coral-red border-coral-red';
      default:
        return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const trendDistribution = [
    { name: 'Improving', value: stats.trendsImproving, color: '#10b981' },
    { name: 'Stable', value: stats.totalResidents - stats.trendsImproving - stats.trendsDeclining, color: '#3b82f6' },
    { name: 'Declining', value: stats.trendsDeclining, color: '#ef4444' },
  ];

  const scoreDistribution = [
    { range: '90-100', count: residents.filter(r => r.latest_score >= 90).length },
    { range: '80-89', count: residents.filter(r => r.latest_score >= 80 && r.latest_score < 90).length },
    { range: '70-79', count: residents.filter(r => r.latest_score >= 70 && r.latest_score < 80).length },
    { range: '60-69', count: residents.filter(r => r.latest_score >= 60 && r.latest_score < 70).length },
    { range: '<60', count: residents.filter(r => r.latest_score < 60).length },
  ];

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
        <div className="mb-6">
          <Link href="/organization/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wellness Analytics</h1>
            <p className="text-gray-600 mt-2">Organization-wide wellness insights and trends</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Residents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <p className="text-3xl font-bold text-gray-900">{stats.totalResidents}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Wellness Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-green-600" />
                <p className="text-3xl font-bold text-gray-900">{stats.avgWellnessScore}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <p className="text-3xl font-bold text-gray-900">{stats.activeAlerts}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Check-in Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-purple-600" />
                <p className="text-3xl font-bold text-gray-900">{stats.avgCheckInRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Wellness Trend Distribution</CardTitle>
              <CardDescription>Overall wellness trends across all residents</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trendDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trendDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wellness Score Distribution</CardTitle>
              <CardDescription>Number of residents by score range</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {alerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Active Wellness Alerts</CardTitle>
              <CardDescription>Residents requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <div>
                          <h4 className="font-semibold text-gray-900">{alert.resident_name}</h4>
                          <p className="text-sm text-gray-600">{alert.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(alert.detected_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Resident Wellness Overview</CardTitle>
            <CardDescription>Individual resident wellness scores and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {residents
                .sort((a, b) => {
                  if (a.alert_count !== b.alert_count) return b.alert_count - a.alert_count;
                  return a.latest_score - b.latest_score;
                })
                .map((resident) => (
                  <div key={resident.resident_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{resident.resident_name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">
                              Score: <strong>{resident.latest_score}</strong>
                            </span>
                            <span className="text-sm text-gray-600">
                              Check-ins: <strong>{resident.check_in_rate}%</strong>
                            </span>
                            {resident.alert_count > 0 && (
                              <span className="text-sm text-red-600">
                                <strong>{resident.alert_count}</strong> alert{resident.alert_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={getTrendColor(resident.trend)}>
                          {resident.trend}
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/organization/residents/${resident.resident_id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
