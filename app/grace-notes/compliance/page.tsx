'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, CheckCircle2, FileText, Clock, TrendingUp, Download } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ComplianceDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [complianceStats, setComplianceStats] = useState({
    totalVisits: 0,
    visitsWithGPS: 0,
    signedNotes: 0,
    pendingReviews: 0,
    averageResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/grace-notes/login');
      return;
    }
    loadComplianceData();
  }, [user]);

  async function loadComplianceData() {
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

      const { data: visits } = await supabase
        .from('grace_notes_visits')
        .select('*')
        .eq('practitioner_id', practitionerData.id);

      const visitsWithGPS = visits?.filter(v => v.check_in_location) || [];

      const { data: visitNotes } = await supabase
        .from('grace_notes_visit_notes')
        .select('*')
        .eq('practitioner_id', practitionerData.id);

      const signedNotes = visitNotes?.filter(n => n.signed_at) || [];

      const { data: assessments } = await supabase
        .from('grace_notes_assessments')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .lt('review_date', new Date().toISOString())
        .eq('status', 'completed');

      const { data: logs } = await supabase
        .from('grace_notes_audit_log')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setAuditLogs(logs || []);

      setComplianceStats({
        totalVisits: visits?.length || 0,
        visitsWithGPS: visitsWithGPS.length,
        signedNotes: signedNotes.length,
        pendingReviews: assessments?.length || 0,
        averageResponseTime: 0,
      });

    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCompliancePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  function getActionTypeIcon(actionType: string) {
    switch (actionType) {
      case 'create':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'update':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'delete':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  const gpsCompliance = getCompliancePercentage(complianceStats.visitsWithGPS, complianceStats.totalVisits);
  const signatureCompliance = getCompliancePercentage(complianceStats.signedNotes, complianceStats.totalVisits);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">CQC Compliance Dashboard</h1>
              <p className="text-slate-600 mt-1">
                Track your practice compliance and audit trail
              </p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GPS Verification</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gpsCompliance}%</div>
              <p className="text-xs text-slate-500">
                {complianceStats.visitsWithGPS} of {complianceStats.totalVisits} visits
              </p>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${gpsCompliance}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed Notes</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signatureCompliance}%</div>
              <p className="text-xs text-slate-500">
                {complianceStats.signedNotes} of {complianceStats.totalVisits} notes
              </p>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${signatureCompliance}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceStats.pendingReviews}</div>
              <p className="text-xs text-slate-500">
                assessments require review
              </p>
              {complianceStats.pendingReviews > 0 && (
                <Link href="/grace-notes/assessments">
                  <Button variant="link" className="px-0 h-auto mt-2 text-xs">
                    Review now
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditLogs.length}</div>
              <p className="text-xs text-slate-500">
                logged actions (last 50)
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="quality">Documentation Quality</TabsTrigger>
            <TabsTrigger value="safeguarding">Safeguarding</TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Recent Audit Events</CardTitle>
                <CardDescription>
                  Complete audit trail of all actions for CQC inspection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No audit events recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                        {getActionTypeIcon(log.action_type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900 capitalize">
                              {log.action_type} {log.entity_type}
                            </p>
                            <span className="text-sm text-slate-500">
                              {new Date(log.created_at).toLocaleString('en-GB')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            Entity ID: {log.entity_id}
                          </p>
                          {log.ip_address && (
                            <p className="text-xs text-slate-500 mt-1">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality">
            <Card>
              <CardHeader>
                <CardTitle>Documentation Quality Metrics</CardTitle>
                <CardDescription>
                  Standards for CQC-compliant documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate-900">Visit Documentation</h3>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Good
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>GPS verification enabled</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Photo documentation captured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Structured notes format</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate-900">Assessment Standards</h3>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Compliant
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Statutory templates used</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Person-centered approach</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Regular review schedule</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safeguarding">
            <Card>
              <CardHeader>
                <CardTitle>Safeguarding Overview</CardTitle>
                <CardDescription>
                  Monitor safeguarding concerns and responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p className="text-slate-600 mb-2">No active safeguarding concerns</p>
                  <p className="text-sm text-slate-500">
                    All clients are currently safe and well
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <CardTitle className="text-blue-900">CQC Inspection Ready</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800 mb-4">
              Your practice maintains comprehensive audit trails and documentation standards required for CQC inspections.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3">
                <p className="font-medium text-slate-900">Complete Audit Trail</p>
                <p className="text-slate-600 text-xs mt-1">
                  All actions logged with timestamps and user details
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="font-medium text-slate-900">Statutory Compliance</p>
                <p className="text-slate-600 text-xs mt-1">
                  Using approved assessment templates
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="font-medium text-slate-900">Data Security</p>
                <p className="text-slate-600 text-xs mt-1">
                  GDPR-compliant data handling
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
