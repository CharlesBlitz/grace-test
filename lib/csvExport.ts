import { format } from 'date-fns';

interface ExportConfig {
  includeHeaders: boolean;
  dateFormat: string;
  delimiter: string;
}

const defaultConfig: ExportConfig = {
  includeHeaders: true,
  dateFormat: 'dd/MM/yyyy HH:mm',
  delimiter: ',',
};

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatDate(date: string | Date, format_string: string): string {
  try {
    return format(new Date(date), format_string);
  } catch (error) {
    return String(date);
  }
}

export function exportCareInteractions(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Interaction ID',
      'Resident Name',
      'Interaction Type',
      'Start Time',
      'End Time',
      'Duration (seconds)',
      'Transcript',
      'Sentiment',
      'Detected Concerns',
      'Is Incident',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(interaction => {
    lines.push([
      interaction.id,
      interaction.users?.name || 'Unknown',
      interaction.interaction_type,
      formatDate(interaction.interaction_start, cfg.dateFormat),
      formatDate(interaction.interaction_end, cfg.dateFormat),
      interaction.duration_seconds,
      interaction.raw_transcript,
      interaction.sentiment_analysis?.overall_sentiment || '',
      JSON.stringify(interaction.detected_concerns || []),
      interaction.is_incident ? 'Yes' : 'No',
      formatDate(interaction.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function exportIncidentReports(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Incident ID',
      'Resident Name',
      'Severity',
      'Categories',
      'Detected Keywords',
      'Confidence Score',
      'Resolved',
      'First Acknowledged At',
      'Staff Notified Count',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(incident => {
    lines.push([
      incident.id,
      incident.users?.name || 'Unknown',
      incident.severity,
      (incident.categories || []).join('; '),
      (incident.detected_keywords || []).join('; '),
      incident.confidence_score,
      incident.resolved ? 'Yes' : 'No',
      incident.first_acknowledged_at ? formatDate(incident.first_acknowledged_at, cfg.dateFormat) : 'Not acknowledged',
      incident.staff_notified_count,
      formatDate(incident.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function exportCarePlans(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Care Plan ID',
      'Resident Name',
      'Plan Name',
      'Plan Type',
      'Status',
      'Start Date',
      'End Date',
      'Review Date',
      'Goals Count',
      'Tasks Count',
      'Completion Rate %',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(plan => {
    lines.push([
      plan.id,
      plan.resident?.name || 'Unknown',
      plan.plan_name,
      plan.plan_type,
      plan.status,
      formatDate(plan.start_date, 'dd/MM/yyyy'),
      plan.end_date ? formatDate(plan.end_date, 'dd/MM/yyyy') : 'Ongoing',
      formatDate(plan.review_date, 'dd/MM/yyyy'),
      plan.goals_count || 0,
      plan.tasks_count || 0,
      plan.completion_rate || 0,
      formatDate(plan.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function exportMedicationLogs(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Log ID',
      'Resident Name',
      'Medication Name',
      'Dosage',
      'Scheduled Time',
      'Administered Time',
      'Status',
      'Administered By',
      'Notes',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(log => {
    lines.push([
      log.id,
      log.resident?.name || 'Unknown',
      log.medication_name,
      log.dosage,
      formatDate(log.scheduled_time, cfg.dateFormat),
      log.administered_time ? formatDate(log.administered_time, cfg.dateFormat) : 'Not administered',
      log.status,
      log.administered_by?.name || '',
      log.notes || '',
      formatDate(log.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function exportDailyNotes(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Note ID',
      'Resident Name',
      'Document Date',
      'Care Notes',
      'Mood Assessment',
      'Physical Health',
      'Social Engagement',
      'Concerns',
      'Status',
      'Documented By',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(note => {
    lines.push([
      note.id,
      note.users?.name || 'Unknown',
      formatDate(note.document_date, 'dd/MM/yyyy'),
      note.care_notes,
      note.mood_assessment,
      note.physical_health,
      note.social_engagement,
      (note.detected_concerns || []).join('; '),
      note.status,
      note.documented_by?.name || '',
      formatDate(note.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function exportAssessments(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Assessment ID',
      'Resident Name',
      'Assessment Type',
      'Assessment Date',
      'Overall Score',
      'Findings',
      'Recommendations',
      'Assessed By',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(assessment => {
    lines.push([
      assessment.id,
      assessment.resident?.name || 'Unknown',
      assessment.assessment_type,
      formatDate(assessment.assessment_date, 'dd/MM/yyyy'),
      assessment.overall_score || '',
      assessment.findings || '',
      assessment.recommendations || '',
      assessment.assessed_by?.name || '',
      formatDate(assessment.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function exportStaffActivity(data: any[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...defaultConfig, ...config };
  const lines: string[] = [];

  if (cfg.includeHeaders) {
    lines.push([
      'Activity ID',
      'Staff Name',
      'Activity Type',
      'Resident Name',
      'Description',
      'Duration (minutes)',
      'Status',
      'Created At'
    ].map(escapeCSVValue).join(cfg.delimiter));
  }

  data.forEach(activity => {
    lines.push([
      activity.id,
      activity.staff?.name || 'Unknown',
      activity.activity_type,
      activity.resident?.name || '',
      activity.description || '',
      activity.duration_minutes || '',
      activity.status,
      formatDate(activity.created_at, cfg.dateFormat)
    ].map(escapeCSVValue).join(cfg.delimiter));
  });

  return lines.join('\n');
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function addExportMetadata(csvContent: string, metadata: {
  organizationName: string;
  exportDate: Date;
  dateRange?: { start: Date; end: Date };
  exportedBy: string;
}): string {
  const metadataLines = [
    `# Export Metadata`,
    `# Organization: ${metadata.organizationName}`,
    `# Exported: ${format(metadata.exportDate, 'dd/MM/yyyy HH:mm')}`,
    `# Exported By: ${metadata.exportedBy}`,
  ];

  if (metadata.dateRange) {
    metadataLines.push(
      `# Date Range: ${format(metadata.dateRange.start, 'dd/MM/yyyy')} to ${format(metadata.dateRange.end, 'dd/MM/yyyy')}`
    );
  }

  metadataLines.push('');

  return metadataLines.join('\n') + '\n' + csvContent;
}
