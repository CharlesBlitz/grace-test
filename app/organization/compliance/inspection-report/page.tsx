'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Calendar,
} from 'lucide-react';
import { complianceService } from '@/lib/complianceService';
import { supabase } from '@/lib/supabaseClient';

export default function InspectionReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [reportType, setReportType] = useState<string>('full_inspection');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrganization();
  }, [user]);

  const loadOrganization = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (orgUser) {
        setOrganizationId(orgUser.organization_id);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const handleGenerate = async () => {
    if (!organizationId || !dateRangeStart || !dateRangeEnd) {
      setResult({
        success: false,
        message: 'Please select date range for the report',
      });
      return;
    }

    if (!user?.id) {
      setResult({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const startDate = new Date(dateRangeStart);
      const endDate = new Date(dateRangeEnd);

      const { reportId, error } = await complianceService.generateInspectionReport(
        organizationId,
        user.id,
        reportType,
        startDate,
        endDate
      );

      if (error || !reportId) {
        setResult({
          success: false,
          message: error?.message || 'Failed to generate report',
        });
      } else {
        setResult({
          success: true,
          message: 'CQC inspection report generated successfully!',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while generating the report',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compliance
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Generate CQC Inspection Report
          </h1>
          <p className="text-slate-600">
            Create comprehensive inspection-ready reports for CQC compliance
          </p>
        </div>

        {result && (
          <Alert className={result.success ? 'bg-green-50 border-green-200 mb-6' : 'bg-red-50 border-red-200 mb-6'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.message}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Configure the parameters for your CQC inspection report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_inspection">Full Inspection Report</SelectItem>
                  <SelectItem value="safe">Safe - Safeguarding & Risk</SelectItem>
                  <SelectItem value="effective">Effective - Care & Outcomes</SelectItem>
                  <SelectItem value="caring">Caring - Compassion & Dignity</SelectItem>
                  <SelectItem value="responsive">Responsive - Person-Centered Care</SelectItem>
                  <SelectItem value="well_led">Well-Led - Governance & Quality</SelectItem>
                  <SelectItem value="pre_inspection">Pre-Inspection Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-600">Start Date</Label>
                  <Input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    max={dateRangeEnd || undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">End Date</Label>
                  <Input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    min={dateRangeStart || undefined}
                  />
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The report will include compliance scores, identified gaps, evidence references, and
                recommendations for improvement based on CQC fundamental standards.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Report Sections</CardTitle>
            <CardDescription>The following sections will be included in your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Executive Summary</p>
                <p className="text-sm text-slate-600">Overall compliance rating and key findings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Compliance Scores</p>
                <p className="text-sm text-slate-600">
                  Detailed scores for each CQC fundamental standard
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Documentation Coverage</p>
                <p className="text-sm text-slate-600">
                  Analysis of care plans, daily notes, and assessments
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Areas of Strength</p>
                <p className="text-sm text-slate-600">
                  Highlighted excellent practices and high-performing areas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Areas for Improvement</p>
                <p className="text-sm text-slate-600">Identified gaps and recommended actions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Evidence References</p>
                <p className="text-sm text-slate-600">Links to supporting documentation and records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating} size="lg">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
