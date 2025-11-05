'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Mail,
  AlertCircle,
  Smile,
  Battery,
  Moon,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Elder {
  id: string;
  name: string;
}

interface WellnessSummary {
  id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  generated_at: string;
  total_check_ins: number;
  check_in_completion_rate: number;
  avg_mood_rating: number;
  mood_trend: string;
  avg_energy_level: number;
  energy_trend: string;
  avg_sleep_quality: number;
  avg_hours_slept: number;
  sleep_trend: string;
  avg_pain_level: number;
  pain_trend: string;
  days_with_pain: number;
  overall_wellness_score: number;
  wellness_trend: string;
  key_insights: string[];
  concerning_patterns: string[];
  positive_highlights: string[];
  sent_to_family: boolean;
  family_email_sent_at: string;
}

interface WellnessAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  detected_at: string;
  status: string;
}

export default function WellnessReportsPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [summaries, setSummaries] = useState<WellnessSummary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<WellnessSummary | null>(null);
  const [alerts, setAlerts] = useState<WellnessAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadElders();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedElder) {
      loadWellnessData();
    }
  }, [selectedElder]);

  const loadElders = async () => {
    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', profile?.id);

      if (relationships && relationships.length > 0) {
        const elderIds = relationships.map((r) => r.elder_id);
        const { data: eldersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading elders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWellnessData = async () => {
    if (!selectedElder) return;

    try {
      const [summariesData, alertsData] = await Promise.all([
        supabase
          .from('wellness_summaries')
          .select('*')
          .eq('elder_id', selectedElder.id)
          .order('generated_at', { ascending: false })
          .limit(12),
        supabase
          .from('wellness_alerts')
          .select('*')
          .eq('elder_id', selectedElder.id)
          .in('status', ['active', 'acknowledged'])
          .order('detected_at', { ascending: false })
          .limit(10),
      ]);

      if (summariesData.data) {
        setSummaries(summariesData.data);
        if (summariesData.data.length > 0) {
          setSelectedSummary(summariesData.data[0]);
        }
      }

      if (alertsData.data) {
        setAlerts(alertsData.data);
      }
    } catch (error) {
      console.error('Error loading wellness data:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-mint-green" strokeWidth={1.5} />;
      case 'declining':
      case 'worsening':
        return <TrendingDown className="w-5 h-5 text-coral-red" strokeWidth={1.5} />;
      default:
        return <Minus className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-mint-green/20 text-mint-green border-mint-green';
      case 'declining':
      case 'worsening':
        return 'bg-coral-red/20 text-coral-red border-coral-red';
      default:
        return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const prepareChartData = () => {
    return summaries.slice().reverse().map(s => ({
      date: formatDate(s.report_period_end),
      mood: s.avg_mood_rating,
      energy: s.avg_energy_level,
      sleep: s.avg_sleep_quality,
      wellness: s.overall_wellness_score,
    }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy py-12">Loading...</div>
      </main>
    );
  }

  if (elders.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
            <CardTitle className="text-3xl mb-4">No Elder Accounts Linked</CardTitle>
            <CardDescription className="text-xl mb-6">
              You haven't been linked to any elder accounts yet.
            </CardDescription>
            <Link href="/nok-dashboard">
              <Button className="bg-mint-green hover:bg-mint-green/90 text-deep-navy">
                Go to Dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  const chartData = prepareChartData();

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/nok-dashboard">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
              <CardTitle className="text-4xl">Wellness Reports</CardTitle>
            </div>
            <CardDescription className="text-xl">
              Track wellness patterns and stay informed about your loved one's wellbeing
            </CardDescription>
          </CardHeader>
        </Card>

        {elders.length > 1 && (
          <Card className="bg-white rounded-[20px] shadow-md p-6 mb-6">
            <div className="flex gap-3 flex-wrap">
              {elders.map((elder) => (
                <Button
                  key={elder.id}
                  onClick={() => setSelectedElder(elder)}
                  variant={selectedElder?.id === elder.id ? 'default' : 'outline'}
                  className="rounded-[16px]"
                >
                  {elder.name}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {alerts.length > 0 && (
          <Card className="bg-coral-red/10 border-2 border-coral-red rounded-[20px] shadow-md mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-coral-red flex items-center gap-2">
                <AlertCircle className="w-6 h-6" strokeWidth={1.5} />
                Active Wellness Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-deep-navy">{alert.title}</h4>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-deep-navy/70">{alert.description}</p>
                        <p className="text-xs text-deep-navy/50 mt-2">
                          Detected {formatDate(alert.detected_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {summaries.length === 0 ? (
          <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
            <CardTitle className="text-2xl mb-2">No Wellness Reports Yet</CardTitle>
            <CardDescription className="text-lg">
              Reports will appear here once your loved one completes their wellness check-ins
            </CardDescription>
          </Card>
        ) : (
          <Tabs defaultValue="latest" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/50 rounded-[20px] p-1">
              <TabsTrigger
                value="latest"
                className="rounded-[16px] data-[state=active]:bg-sky-blue data-[state=active]:text-deep-navy text-lg py-3"
              >
                Latest Report
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="rounded-[16px] data-[state=active]:bg-mint-green data-[state=active]:text-deep-navy text-lg py-3"
              >
                Trends
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-[16px] data-[state=active]:bg-warm-cream data-[state=active]:text-deep-navy text-lg py-3"
              >
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="latest">
              {selectedSummary && (
                <Card className="bg-white rounded-[20px] shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          {formatDate(selectedSummary.report_period_start)} - {formatDate(selectedSummary.report_period_end)}
                        </CardTitle>
                        <CardDescription className="text-lg mt-2">
                          {selectedSummary.total_check_ins} wellness check-ins completed
                        </CardDescription>
                      </div>
                      <Badge className={getTrendColor(selectedSummary.wellness_trend)}>
                        {selectedSummary.wellness_trend}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 bg-gradient-to-br from-mint-green/20 to-sky-blue/20 rounded-[16px]">
                      <div className="text-sm text-deep-navy/70 mb-2">Overall Wellness Score</div>
                      <div className="text-6xl font-bold text-deep-navy mb-2">
                        {selectedSummary.overall_wellness_score}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        {getTrendIcon(selectedSummary.wellness_trend)}
                        <span className="text-lg capitalize">{selectedSummary.wellness_trend}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-soft-gray/10">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Smile className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                            <span className="text-sm text-deep-navy/70">Mood</span>
                          </div>
                          <div className="text-3xl font-bold text-deep-navy mb-1">
                            {selectedSummary.avg_mood_rating.toFixed(1)}/5
                          </div>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(selectedSummary.mood_trend)}
                            <span className="text-xs capitalize">{selectedSummary.mood_trend}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-soft-gray/10">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Battery className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                            <span className="text-sm text-deep-navy/70">Energy</span>
                          </div>
                          <div className="text-3xl font-bold text-deep-navy mb-1">
                            {selectedSummary.avg_energy_level.toFixed(1)}/5
                          </div>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(selectedSummary.energy_trend)}
                            <span className="text-xs capitalize">{selectedSummary.energy_trend}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-soft-gray/10">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Moon className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                            <span className="text-sm text-deep-navy/70">Sleep</span>
                          </div>
                          <div className="text-3xl font-bold text-deep-navy mb-1">
                            {selectedSummary.avg_sleep_quality.toFixed(1)}/5
                          </div>
                          <div className="text-xs text-deep-navy/60">
                            {selectedSummary.avg_hours_slept.toFixed(1)} hours avg
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-soft-gray/10">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-coral-red" strokeWidth={1.5} />
                            <span className="text-sm text-deep-navy/70">Pain</span>
                          </div>
                          <div className="text-3xl font-bold text-deep-navy mb-1">
                            {selectedSummary.avg_pain_level.toFixed(1)}/10
                          </div>
                          <div className="text-xs text-deep-navy/60">
                            {selectedSummary.days_with_pain} days with pain
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedSummary.positive_highlights && selectedSummary.positive_highlights.length > 0 && (
                      <Card className="bg-mint-green/10 border-2 border-mint-green/30">
                        <CardHeader>
                          <CardTitle className="text-xl text-mint-green">Positive Highlights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedSummary.positive_highlights.map((highlight, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-mint-green mt-1">✓</span>
                                <span className="text-deep-navy">{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {selectedSummary.concerning_patterns && selectedSummary.concerning_patterns.length > 0 && (
                      <Card className="bg-coral-red/10 border-2 border-coral-red/30">
                        <CardHeader>
                          <CardTitle className="text-xl text-coral-red">Areas for Attention</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedSummary.concerning_patterns.map((pattern, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-coral-red flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                                <span className="text-deep-navy">{pattern}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-coral-red mt-4">
                            Care staff have been notified and will follow up as needed.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="trends">
              <Card className="bg-white rounded-[20px] shadow-md">
                <CardHeader>
                  <CardTitle className="text-2xl">Wellness Trends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Overall Wellness Score Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="wellness" stroke="#10b981" strokeWidth={3} name="Wellness Score" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Detailed Metrics Comparison</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={2} name="Mood" />
                        <Line type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={2} name="Energy" />
                        <Line type="monotone" dataKey="sleep" stroke="#8b5cf6" strokeWidth={2} name="Sleep" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaries.map((summary) => (
                  <Card
                    key={summary.id}
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => {
                      setSelectedSummary(summary);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {formatDate(summary.report_period_start)} - {formatDate(summary.report_period_end)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {summary.total_check_ins} check-ins • {summary.check_in_completion_rate}% complete
                          </CardDescription>
                        </div>
                        <Badge className={getTrendColor(summary.wellness_trend)}>
                          {summary.wellness_trend}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-deep-navy/70">Wellness Score</span>
                        <span className="text-3xl font-bold text-deep-navy">{summary.overall_wellness_score}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
