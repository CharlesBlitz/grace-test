import { supabase } from './supabaseClient';
import { PDFExporter } from './pdfExport';
import {
  exportCareInteractions,
  exportIncidentReports,
  exportCarePlans,
  exportMedicationLogs,
  exportDailyNotes,
  exportAssessments,
  exportStaffActivity,
  addExportMetadata,
} from './csvExport';

export type ExportType = 'pdf' | 'csv';
export type DataType = 'care_plans' | 'incidents' | 'medications' | 'daily_notes' | 'assessments' | 'interactions' | 'all';

interface ExportOptions {
  organizationId: string;
  userId: string;
  exportType: ExportType;
  dataType: DataType;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  residentIds?: string[];
  filters?: Record<string, any>;
}

interface OrganizationData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logo_url?: string;
}

export class ExportService {
  async logExport(options: ExportOptions, status: 'completed' | 'failed', fileSize?: number, recordCount?: number, errorMessage?: string) {
    const { data, error } = await supabase
      .from('export_logs')
      .insert({
        organization_id: options.organizationId,
        user_id: options.userId,
        export_type: options.exportType,
        data_type: options.dataType,
        date_range_start: options.dateRangeStart?.toISOString().split('T')[0],
        date_range_end: options.dateRangeEnd?.toISOString().split('T')[0],
        resident_ids: options.residentIds || [],
        filters_applied: options.filters || {},
        file_size_bytes: fileSize,
        record_count: recordCount,
        export_status: status,
        error_message: errorMessage,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log export:', error);
    }

    return data;
  }

  async getOrganizationData(organizationId: string): Promise<OrganizationData> {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, address, phone, logo_url')
      .eq('id', organizationId)
      .single();

    if (error) throw error;
    return data;
  }

  async fetchCareInteractions(organizationId: string, options: Partial<ExportOptions>) {
    let query = supabase
      .from('care_interaction_logs')
      .select(`
        *,
        users!care_interaction_logs_resident_id_fkey(name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('interaction_start', { ascending: false });

    if (options.dateRangeStart) {
      query = query.gte('interaction_start', options.dateRangeStart.toISOString());
    }

    if (options.dateRangeEnd) {
      query = query.lte('interaction_start', options.dateRangeEnd.toISOString());
    }

    if (options.residentIds && options.residentIds.length > 0) {
      query = query.in('resident_id', options.residentIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async fetchIncidentReports(organizationId: string, options: Partial<ExportOptions>) {
    let query = supabase
      .from('incident_alert_log')
      .select(`
        *,
        users!incident_alert_log_resident_id_fkey(name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options.dateRangeStart) {
      query = query.gte('created_at', options.dateRangeStart.toISOString());
    }

    if (options.dateRangeEnd) {
      query = query.lte('created_at', options.dateRangeEnd.toISOString());
    }

    if (options.residentIds && options.residentIds.length > 0) {
      query = query.in('resident_id', options.residentIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async fetchDailyNotes(organizationId: string, options: Partial<ExportOptions>) {
    let query = supabase
      .from('care_documentation')
      .select(`
        *,
        users!care_documentation_resident_id_fkey(name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('document_date', { ascending: false });

    if (options.dateRangeStart) {
      query = query.gte('document_date', options.dateRangeStart.toISOString().split('T')[0]);
    }

    if (options.dateRangeEnd) {
      query = query.lte('document_date', options.dateRangeEnd.toISOString().split('T')[0]);
    }

    if (options.residentIds && options.residentIds.length > 0) {
      query = query.in('resident_id', options.residentIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async exportToPDF(options: ExportOptions): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      const organization = await this.getOrganizationData(options.organizationId);
      const pdfExporter = new PDFExporter();

      let blob: Blob;
      let recordCount = 0;

      if (options.dataType === 'daily_notes') {
        const notes = await this.fetchDailyNotes(options.organizationId, options);
        recordCount = notes.length;

        if (notes.length === 0) {
          throw new Error('No daily notes found for the selected criteria');
        }

        blob = pdfExporter.exportDailyNote(
          {
            resident_name: notes[0].users?.name || 'Unknown',
            document_date: notes[0].document_date,
            care_notes: notes[0].care_notes || '',
            mood_assessment: notes[0].mood_assessment || '',
            physical_health: notes[0].physical_health || '',
            social_engagement: notes[0].social_engagement || '',
            concerns: notes[0].detected_concerns || [],
            staff_name: 'Staff Member',
            created_at: notes[0].created_at,
          },
          {
            name: organization.name,
            address: organization.address,
            phone: organization.phone,
          }
        );
      } else if (options.dataType === 'incidents') {
        const incidents = await this.fetchIncidentReports(options.organizationId, options);
        recordCount = incidents.length;

        if (incidents.length === 0) {
          throw new Error('No incidents found for the selected criteria');
        }

        blob = pdfExporter.exportIncidentReport(
          {
            resident_name: incidents[0].users?.name || 'Unknown',
            incident_date: incidents[0].created_at,
            severity: incidents[0].severity,
            categories: incidents[0].categories || [],
            description: `Incident detected with confidence score: ${incidents[0].confidence_score}. Keywords: ${incidents[0].detected_keywords?.join(', ')}`,
            immediate_actions: incidents[0].suggested_actions?.join('; ') || 'See incident log',
            witnesses: [],
            staff_notified: [],
            follow_up_required: incidents[0].resolved ? 'Resolved' : 'Pending resolution',
          },
          {
            name: organization.name,
            address: organization.address,
            phone: organization.phone,
          }
        );
      } else {
        throw new Error(`PDF export not yet implemented for data type: ${options.dataType}`);
      }

      await this.logExport(options, 'completed', blob.size, recordCount);

      return { success: true, blob };
    } catch (error: any) {
      await this.logExport(options, 'failed', undefined, undefined, error.message);
      return { success: false, error: error.message };
    }
  }

  async exportToCSV(options: ExportOptions): Promise<{ success: boolean; csv?: string; error?: string }> {
    try {
      const organization = await this.getOrganizationData(options.organizationId);
      const { data: user } = await supabase.from('users').select('name').eq('id', options.userId).single();

      let csvContent = '';
      let recordCount = 0;

      if (options.dataType === 'interactions' || options.dataType === 'all') {
        const interactions = await this.fetchCareInteractions(options.organizationId, options);
        recordCount += interactions.length;
        csvContent += exportCareInteractions(interactions) + '\n\n';
      }

      if (options.dataType === 'incidents' || options.dataType === 'all') {
        const incidents = await this.fetchIncidentReports(options.organizationId, options);
        recordCount += incidents.length;
        csvContent += exportIncidentReports(incidents) + '\n\n';
      }

      if (options.dataType === 'daily_notes' || options.dataType === 'all') {
        const notes = await this.fetchDailyNotes(options.organizationId, options);
        recordCount += notes.length;
        csvContent += exportDailyNotes(notes) + '\n\n';
      }

      if (csvContent === '') {
        throw new Error('No data found for the selected criteria');
      }

      const csvWithMetadata = addExportMetadata(csvContent, {
        organizationName: organization.name,
        exportDate: new Date(),
        dateRange: options.dateRangeStart && options.dateRangeEnd
          ? { start: options.dateRangeStart, end: options.dateRangeEnd }
          : undefined,
        exportedBy: user?.name || 'Unknown',
      });

      const fileSize = new Blob([csvWithMetadata]).size;
      await this.logExport(options, 'completed', fileSize, recordCount);

      return { success: true, csv: csvWithMetadata };
    } catch (error: any) {
      await this.logExport(options, 'failed', undefined, undefined, error.message);
      return { success: false, error: error.message };
    }
  }

  async getExportHistory(organizationId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('export_logs')
      .select(`
        *,
        users(name, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getExportStats(organizationId: string) {
    const { count: totalExports, error: countError } = await supabase
      .from('export_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: failedExports, error: failedError } = await supabase
      .from('export_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('export_status', 'failed');

    const { data: recentExports, error: recentError } = await supabase
      .from('export_logs')
      .select('export_type, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    return {
      totalExports: totalExports || 0,
      failedExports: failedExports || 0,
      recentExports: recentExports || [],
    };
  }
}

export const exportService = new ExportService();
