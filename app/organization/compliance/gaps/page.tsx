'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileX,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { complianceService } from '@/lib/complianceService';

interface ComplianceGap {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  residentId?: string;
  residentName?: string;
  description: string;
  recommendedAction: string;
  dueDate?: Date;
  daysOverdue?: number;
}

export default function ComplianceGapsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [gaps, setGaps] = useState<ComplianceGap[]>([]);
  const [filteredGaps, setFilteredGaps] = useState<ComplianceGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  useEffect(() => {
    filterGaps();
  }, [searchTerm, severityFilter, gaps]);

  const loadData = async () => {
    try {
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
      await analyzeGaps(orgUser.organization_id);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeGaps = async (orgId?: string) => {
    const targetOrgId = orgId || organizationId;
    if (!targetOrgId) return;

    setAnalyzing(true);
    try {
      const { gaps: identifiedGaps, error } = await complianceService.identifyGaps(targetOrgId);

      if (error) {
        console.error('Error identifying gaps:', error);
        return;
      }

      setGaps(identifiedGaps || []);
    } catch (error) {
      console.error('Exception analyzing gaps:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const filterGaps = () => {
    let filtered = gaps;

    if (searchTerm) {
      filtered = filtered.filter(
        (gap) =>
          gap.residentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          gap.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((gap) => gap.severity === severityFilter);
    }

    setFilteredGaps(filtered);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_documentation':
        return <FileX className="h-4 w-4" />;
      case 'unsigned_document':
        return <UserX className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const criticalCount = gaps.filter((g) => g.severity === 'critical').length;
  const highCount = gaps.filter((g) => g.severity === 'high').length;
  const mediumCount = gaps.filter((g) => g.severity === 'medium').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading gap analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Compliance Gap Analysis</h1>
              <p className="text-slate-600">
                Identified {gaps.length} {gaps.length === 1 ? 'area' : 'areas'} requiring attention
              </p>
            </div>
            <Button onClick={() => analyzeGaps()} disabled={analyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
              Re-analyze
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">Critical</p>
              <p className="text-xs text-slate-500 mt-1">Immediate action required</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">{highCount}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">High Priority</p>
              <p className="text-xs text-slate-500 mt-1">Address within 48 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">{mediumCount}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">Medium Priority</p>
              <p className="text-xs text-slate-500 mt-1">Address within 1 week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {Math.round(((gaps.length > 0 ? 100 - gaps.length : 100) / 100) * 100)}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">Compliance</p>
              <p className="text-xs text-slate-500 mt-1">Overall status</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by resident or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredGaps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              {gaps.length === 0 ? (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Excellent! No Compliance Gaps Found
                  </h3>
                  <p className="text-slate-600">
                    Your organization meets all compliance requirements at this time.
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Matching Gaps</h3>
                  <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGaps.map((gap, index) => (
              <Card key={index} className={`border-2 ${getSeverityColor(gap.severity)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">{getSeverityIcon(gap.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                gap.severity === 'critical'
                                  ? 'border-red-600 text-red-600'
                                  : gap.severity === 'high'
                                  ? 'border-orange-600 text-orange-600'
                                  : gap.severity === 'medium'
                                  ? 'border-yellow-600 text-yellow-600'
                                  : 'border-blue-600 text-blue-600'
                              }`}
                            >
                              {gap.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getTypeIcon(gap.type)}
                              <span className="ml-1">{gap.type.replace(/_/g, ' ')}</span>
                            </Badge>
                          </div>
                          {gap.residentName && (
                            <p className="text-sm font-semibold text-slate-900 mb-1">
                              Resident: {gap.residentName}
                            </p>
                          )}
                          <p className="text-sm text-slate-700">{gap.description}</p>
                        </div>
                        {gap.daysOverdue && gap.daysOverdue > 0 && (
                          <Badge variant="destructive" className="flex-shrink-0">
                            {gap.daysOverdue} days overdue
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-600">{gap.recommendedAction}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Take Action
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
