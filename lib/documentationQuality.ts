import { supabase } from './supabaseClient';

export interface QualityMetrics {
  completeness_score: number;
  compliance_score: number;
  clarity_score: number;
  timeliness_score: number;
  overall_quality_score: number;
  has_observations: boolean;
  has_actions_taken: boolean;
  has_follow_up: boolean;
  has_risk_assessment: boolean;
  word_count: number;
  time_to_generate_seconds?: number;
  time_to_review_seconds?: number;
  time_saved_seconds?: number;
}

export interface TimeSavingsData {
  documents_generated: number;
  total_time_saved: number;
  time_saved_percentage: number;
  average_quality_score: number;
  average_doc_generation_time: number;
  average_review_time: number;
}

export async function calculateQualityScore(documentationId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_documentation_quality_score', {
      p_documentation_id: documentationId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0;
  }
}

export async function getDocumentationQuality(
  documentationId: string
): Promise<QualityMetrics | null> {
  try {
    const { data, error } = await supabase
      .from('documentation_quality_metrics')
      .select('*')
      .eq('documentation_id', documentationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching quality metrics:', error);
    return null;
  }
}

export async function getOrganizationQualityStats(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('documentation_quality_metrics')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        average_quality: 0,
        total_documents: 0,
        high_quality_count: 0,
        needs_improvement_count: 0,
      };
    }

    const avgQuality = data.reduce((sum, m) => sum + m.overall_quality_score, 0) / data.length;
    const highQuality = data.filter((m) => m.overall_quality_score >= 80).length;
    const needsImprovement = data.filter((m) => m.overall_quality_score < 60).length;

    return {
      average_quality: Math.round(avgQuality),
      total_documents: data.length,
      high_quality_count: highQuality,
      needs_improvement_count: needsImprovement,
      high_quality_percentage: Math.round((highQuality / data.length) * 100),
    };
  } catch (error) {
    console.error('Error fetching organization quality stats:', error);
    return null;
  }
}

export async function trackDocumentationTime(
  documentationId: string,
  organizationId: string,
  generationTimeSeconds: number,
  reviewTimeSeconds?: number
) {
  try {
    const estimatedManualTime = 1800; // 30 minutes
    const timeSaved = estimatedManualTime - generationTimeSeconds - (reviewTimeSeconds || 0);

    const { error } = await supabase
      .from('documentation_quality_metrics')
      .update({
        time_to_generate_seconds: generationTimeSeconds,
        time_to_review_seconds: reviewTimeSeconds || 0,
        estimated_manual_time_seconds: estimatedManualTime,
        time_saved_seconds: timeSaved,
        updated_at: new Date().toISOString(),
      })
      .eq('documentation_id', documentationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error tracking documentation time:', error);
    return false;
  }
}

export async function getStaffTimeSavings(
  organizationId: string,
  staffId: string,
  periodStart: string,
  periodEnd: string
): Promise<TimeSavingsData | null> {
  try {
    // Calculate time savings
    await supabase.rpc('calculate_staff_time_savings', {
      p_organization_id: organizationId,
      p_staff_id: staffId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });

    // Fetch the calculated data
    const { data, error } = await supabase
      .from('staff_time_savings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('staff_id', staffId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching staff time savings:', error);
    return null;
  }
}

export async function getOrganizationTimeSavings(
  organizationId: string,
  periodStart: string,
  periodEnd: string
) {
  try {
    const { data, error } = await supabase
      .from('staff_time_savings')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_staff: 0,
        total_documents: 0,
        total_time_saved_hours: 0,
        total_time_saved_days: 0,
        average_time_saved_per_doc: 0,
        time_saved_percentage: 0,
      };
    }

    const totalDocs = data.reduce((sum, s) => sum + s.documents_generated, 0);
    const totalTimeSaved = data.reduce((sum, s) => sum + s.total_time_saved, 0);
    const totalEstimated = data.reduce((sum, s) => sum + s.estimated_manual_time, 0);

    return {
      total_staff: data.length,
      total_documents: totalDocs,
      total_time_saved_seconds: totalTimeSaved,
      total_time_saved_hours: Math.round(totalTimeSaved / 3600),
      total_time_saved_days: Math.round(totalTimeSaved / 3600 / 8), // 8-hour workdays
      average_time_saved_per_doc: totalDocs > 0 ? Math.round(totalTimeSaved / totalDocs) : 0,
      time_saved_percentage:
        totalEstimated > 0 ? Math.round((totalTimeSaved / totalEstimated) * 100) : 0,
    };
  } catch (error) {
    console.error('Error fetching organization time savings:', error);
    return null;
  }
}

export function formatTimeSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getQualityBadgeColor(score: number): string {
  if (score >= 90) return 'text-green-700 bg-green-100 border-green-200';
  if (score >= 80) return 'text-blue-700 bg-blue-100 border-blue-200';
  if (score >= 70) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
  if (score >= 60) return 'text-orange-700 bg-orange-100 border-orange-200';
  return 'text-red-700 bg-red-100 border-red-200';
}

export function getQualityLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Satisfactory';
  if (score >= 60) return 'Needs Improvement';
  return 'Poor';
}

export async function getDocumentationTemplates() {
  try {
    const { data, error } = await supabase
      .from('documentation_templates')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

export async function incrementTemplateUsage(templateId: string) {
  try {
    const { error } = await supabase.rpc('increment', {
      table_name: 'documentation_templates',
      row_id: templateId,
      column_name: 'usage_count',
    });

    if (error) {
      // Fallback if rpc doesn't exist
      const { data: template } = await supabase
        .from('documentation_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();

      if (template) {
        await supabase
          .from('documentation_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    }
  } catch (error) {
    console.error('Error incrementing template usage:', error);
  }
}

export async function trackDocumentEdit(
  documentationId: string,
  editedBy: string,
  editType: string,
  sectionEdited?: string,
  previousContent?: string,
  newContent?: string,
  wasAiSuggestion = false
) {
  try {
    const { error } = await supabase.from('documentation_edits').insert({
      documentation_id: documentationId,
      edited_by: editedBy,
      edit_type: editType,
      section_edited: sectionEdited,
      previous_content: previousContent,
      new_content: newContent,
      was_ai_suggestion: wasAiSuggestion,
      edit_timestamp: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error tracking document edit:', error);
    return false;
  }
}
