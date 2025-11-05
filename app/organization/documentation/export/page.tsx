'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  Users,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  Settings,
} from 'lucide-react';
import { exportService, ExportType, DataType } from '@/lib/exportService';
import { downloadPDF } from '@/lib/pdfExport';
import { downloadCSV } from '@/lib/csvExport';
import { format } from 'date-fns';

interface Resident {
  id: string;
  name: string;
}

export default function ExportDocumentationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);

  const [exportType, setExportType] = useState<ExportType>('csv');
  const [dataType, setDataType] = useState<DataType>('all');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
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
      setOrganizationName((orgUser.organizations as any)?.name || '');

      const { data: residentsData } = await supabase
        .from('organization_residents')
        .select(`
          resident_id,
          users(id, name)
        `)
        .eq('organization_id', orgUser.organization_id);

      const residentsList = (residentsData || [])
        .map((r: any) => ({
          id: r.users?.id,
          name: r.users?.name,
        }))
        .filter((r: any) => r.id && r.name);

      setResidents(residentsList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!organizationId || !user?.id) return;

    setExporting(true);
    setExportResult(null);

    try {
      const options = {
        organizationId,
        userId: user.id,
        exportType,
        dataType,
        dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
        dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
        residentIds: selectedResidents.length > 0 ? selectedResidents : undefined,
      };

      if (exportType === 'pdf') {
        const result = await exportService.exportToPDF(options);

        if (result.success && result.blob) {
          const filename = `${organizationName.replace(/\s+/g, '_')}_${dataType}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
          downloadPDF(result.blob, filename);
          setExportResult({ success: true, message: 'PDF exported successfully!' });
        } else {
          setExportResult({ success: false, message: result.error || 'Export failed' });
        }
      } else {
        const result = await exportService.exportToCSV(options);

        if (result.success && result.csv) {
          const filename = `${organizationName.replace(/\s+/g, '_')}_${dataType}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
          downloadCSV(result.csv, filename);
          setExportResult({ success: true, message: 'CSV exported successfully!' });
        } else {
          setExportResult({ success: false, message: result.error || 'Export failed' });
        }
      }
    } catch (error: any) {
      setExportResult({ success: false, message: error.message });
    } finally {
      setExporting(false);
    }
  };

  const toggleResident = (residentId: string) => {
    setSelectedResidents(prev =>
      prev.includes(residentId)
        ? prev.filter(id => id !== residentId)
        : [...prev, residentId]
    );
  };

  const selectAllResidents = () => {
    setSelectedResidents(residents.map(r => r.id));
  };

  const deselectAllResidents = () => {
    setSelectedResidents([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documentation
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Export Documentation</h1>
          <p className="text-slate-600">
            Export care documentation in PDF or CSV format for analysis, reporting, or regulatory compliance
          </p>
        </div>

        {exportResult && (
          <Alert className={exportResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {exportResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={exportResult.success ? 'text-green-800' : 'text-red-800'}>
              {exportResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Export Configuration
                </CardTitle>
                <CardDescription>Choose what to export and in which format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select value={exportType} onValueChange={(value: ExportType) => setExportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            PDF Document
                          </div>
                        </SelectItem>
                        <SelectItem value="csv">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            CSV Spreadsheet
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Type</Label>
                    <Select value={dataType} onValueChange={(value: DataType) => setDataType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documentation</SelectItem>
                        <SelectItem value="daily_notes">Daily Care Notes</SelectItem>
                        <SelectItem value="incidents">Incident Reports</SelectItem>
                        <SelectItem value="interactions">Care Interactions</SelectItem>
                        <SelectItem value="care_plans">Care Plans</SelectItem>
                        <SelectItem value="medications">Medication Logs</SelectItem>
                        <SelectItem value="assessments">Assessments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range (Optional)
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

                {exportType === 'pdf' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      PDF exports work best for individual residents or small datasets. For bulk exports, consider using CSV format.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Filter by Residents (Optional)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllResidents}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllResidents}>
                      Clear
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {selectedResidents.length > 0
                    ? `${selectedResidents.length} resident(s) selected`
                    : 'All residents will be included'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {residents.map(resident => (
                    <div
                      key={resident.id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleResident(resident.id)}
                    >
                      <Checkbox
                        checked={selectedResidents.includes(resident.id)}
                        onCheckedChange={() => toggleResident(resident.id)}
                      />
                      <Label className="cursor-pointer flex-1">{resident.name}</Label>
                    </div>
                  ))}
                  {residents.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No residents found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-600">Format</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {exportType === 'pdf' ? (
                      <>
                        <FileText className="h-4 w-4 text-red-600" />
                        <span className="font-medium">PDF Document</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        <span className="font-medium">CSV Spreadsheet</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Data Type</Label>
                  <Badge className="mt-1" variant="outline">
                    {dataType === 'all' ? 'All Documentation' : dataType.replace('_', ' ')}
                  </Badge>
                </div>

                {(dateRangeStart || dateRangeEnd) && (
                  <div>
                    <Label className="text-xs text-slate-600">Date Range</Label>
                    <p className="text-sm mt-1">
                      {dateRangeStart && format(new Date(dateRangeStart), 'dd MMM yyyy')}
                      {dateRangeStart && dateRangeEnd && ' - '}
                      {dateRangeEnd && format(new Date(dateRangeEnd), 'dd MMM yyyy')}
                    </p>
                  </div>
                )}

                {selectedResidents.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-600">Residents</Label>
                    <p className="text-sm mt-1">{selectedResidents.length} selected</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export {exportType.toUpperCase()}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm text-blue-900">Export Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>All exports are logged for audit compliance</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Exported data includes organization branding</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>CSV files include metadata headers</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>PDFs are formatted for regulatory compliance</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
