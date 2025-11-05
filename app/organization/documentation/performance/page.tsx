'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Award,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import {
  getOrganizationQualityStats,
  getOrganizationTimeSavings,
  formatTimeSeconds,
  getQualityBadgeColor,
  getQualityLabel,
} from '@/lib/documentationQuality';

interface PerformanceStats {
  qualityStats: {
    average_quality: number;
    total_documents: number;
    high_quality_count: number;
    high_quality_percentage: number;
    needs_improvement_count: number;
  };
  timeSavings: {
    total_staff: number;
    total_documents: number;
    total_time_saved_hours: number;
    total_time_saved_days: number;
    time_saved_percentage: number;
    average_time_saved_per_doc: number;
  };
}

export default function DocumentationPerformancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadPerformanceData();
  }, [user, timeRange]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);

      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(name)')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      setOrganizationId(orgUser.organization_id);
      setOrganizationName((orgUser.organizations as any)?.name || 'Your Organization');

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 90);
      }

      // Fetch quality stats
      const qualityStats = await getOrganizationQualityStats(orgUser.organization_id);

      // Fetch time savings
      const timeSavings = await getOrganizationTimeSavings(
        orgUser.organization_id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const defaultQualityStats = {
        average_quality: 0,
        total_documents: 0,
        high_quality_count: 0,
        high_quality_percentage: 0,
        needs_improvement_count: 0,
      };

      const defaultTimeSavings = {
        total_staff: 0,
        total_documents: 0,
        total_time_saved_hours: 0,
        total_time_saved_days: 0,
        time_saved_percentage: 0,
        average_time_saved_per_doc: 0,
      };

      setStats({
        qualityStats: qualityStats ? { ...defaultQualityStats, ...qualityStats } : defaultQualityStats,
        timeSavings: timeSavings ? { ...defaultTimeSavings, ...timeSavings } : defaultTimeSavings,
      });
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  const quality = stats?.qualityStats || {
    average_quality: 0,
    total_documents: 0,
    high_quality_count: 0,
    high_quality_percentage: 0,
    needs_improvement_count: 0,
  };
  const savings = stats?.timeSavings || {
    total_staff: 0,
    total_documents: 0,
    total_time_saved_hours: 0,
    total_time_saved_days: 0,
    time_saved_percentage: 0,
    average_time_saved_per_doc: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Documentation Performance
              </h1>
              <p className="text-slate-600">
                Time savings and quality metrics for {organizationName}
              </p>
            </div>
            <Button onClick={() => router.push('/organization/documentation')}>
              <FileText className="h-4 w-4 mr-2" />
              View Documentation
            </Button>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('week')}
            >
              Last 7 Days
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('month')}
            >
              Last 30 Days
            </Button>
            <Button
              variant={timeRange === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('quarter')}
            >
              Last 90 Days
            </Button>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Total Time Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 mb-1">
                {savings.total_time_saved_hours}h
              </div>
              <p className="text-sm text-slate-600">
                {savings.total_time_saved_days} work days
              </p>
              <div className="mt-3">
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  {savings.time_saved_percentage}% faster
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-1">
                {savings.total_documents}
              </div>
              <p className="text-sm text-slate-600">
                By {savings.total_staff} staff members
              </p>
              <div className="mt-3">
                <Badge variant="outline">
                  {formatTimeSeconds(savings.average_time_saved_per_doc)} saved per doc
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-1">
                {quality.average_quality}
                <span className="text-lg text-slate-500">/100</span>
              </div>
              <p className="text-sm text-slate-600">Average documentation quality</p>
              <div className="mt-3">
                <Badge className={getQualityBadgeColor(quality.average_quality)}>
                  {getQualityLabel(quality.average_quality)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                High Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-1">
                {quality.high_quality_percentage}%
              </div>
              <p className="text-sm text-slate-600">
                {quality.high_quality_count} of {quality.total_documents} docs
              </p>
              <div className="mt-3">
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{width: `${quality.high_quality_percentage}%`}} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison with Magic Notes */}
        <Card className="mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" />
              Grace Companion vs Magic Notes
            </CardTitle>
            <CardDescription>
              See how Grace Companion compares to traditional documentation tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">Time Savings</h4>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Magic Notes:</span>
                    <span className="font-medium">63%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Grace Companion:</span>
                    <span className="font-bold text-green-600">
                      {savings.time_saved_percentage}%
                    </span>
                  </div>
                  {savings.time_saved_percentage > 63 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 w-full justify-center">
                      +{savings.time_saved_percentage - 63}% Better!
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">Annual Cost</h4>
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Magic Notes:</span>
                    <span className="font-medium">£75,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Grace Companion:</span>
                    <span className="font-bold text-blue-600">£1,908</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 w-full justify-center">
                    97% Cheaper!
                  </Badge>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">Features</h4>
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Incident detection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">CQC compliance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Family portal</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Care plan integration</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="quality">
              <Award className="h-4 w-4 mr-2" />
              Quality Metrics
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="h-4 w-4 mr-2" />
              Staff Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ROI Calculator</CardTitle>
                  <CardDescription>
                    Calculate your return on investment with Grace Companion
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        Time Saved Per Month
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {Math.round(savings.total_time_saved_hours * (30 / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)))}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        Staff Cost Savings
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        £{Math.round((savings.total_time_saved_hours * 15) * (30 / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        Grace Companion Cost
                      </span>
                      <span className="text-lg font-bold text-slate-900">£159</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-900">Net Monthly Savings</span>
                        <span className="text-2xl font-bold text-green-600">
                          £{Math.round((savings.total_time_saved_hours * 15) * (30 / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90)) - 159)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Based on average care staff hourly rate of £15/hour and Basic plan pricing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Benefits</CardTitle>
                  <CardDescription>
                    What makes Grace Companion different
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 mb-1">70%+ Time Savings</h4>
                        <p className="text-sm text-slate-600">
                          Automatic documentation from voice conversations
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Target className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 mb-1">CQC-Ready</h4>
                        <p className="text-sm text-slate-600">
                          Documentation meets all regulatory standards
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 mb-1">Real-Time Safety</h4>
                        <p className="text-sm text-slate-600">
                          Automatic incident detection and staff alerts
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentation Quality Breakdown</CardTitle>
                <CardDescription>
                  Quality metrics across all documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Quality</span>
                      <span className="text-sm font-bold">{quality.average_quality}/100</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{width: `${quality.average_quality}%`}} />
                </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">High Quality (80+)</span>
                      <span className="text-sm font-bold">
                        {quality.high_quality_count} docs
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{width: `${quality.high_quality_percentage}%`}} />
                </div>
                  </div>
                  {quality.needs_improvement_count > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-800">
                        <strong>{quality.needs_improvement_count} documents</strong> could benefit
                        from review and improvement
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance Summary</CardTitle>
                <CardDescription>
                  Documentation activity and efficiency by staff members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    Individual staff performance metrics coming soon
                  </p>
                  <p className="text-sm text-slate-500">
                    Track each staff member's documentation quality and time savings
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
