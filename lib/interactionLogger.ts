/**
 * Interaction Logger
 *
 * Utility functions for capturing and managing care interactions across the Grace Companion platform.
 * Interactions from voice conversations, reminders, wellness checks, and other features are logged
 * to enable AI documentation generation and compliance tracking.
 */

import { supabase } from './supabaseClient';

export type InteractionType =
  | 'conversation'
  | 'reminder_response'
  | 'wellness_check'
  | 'medication_admin'
  | 'incident'
  | 'activity'
  | 'manual_entry';

export type InteractionSource =
  | 'voice_chat'
  | 'reminder_system'
  | 'manual_entry'
  | 'wellness_check'
  | 'family_message';

export interface CareInteraction {
  resident_id: string;
  staff_id?: string;
  organization_id?: string;
  interaction_type: InteractionType;
  interaction_source: InteractionSource;
  raw_transcript?: string;
  audio_recording_url?: string;
  sentiment_score?: number;
  detected_concerns?: string[];
  location?: string;
  duration_seconds?: number;
  interaction_start?: Date;
  interaction_end?: Date;
  metadata?: Record<string, any>;
}

export interface InteractionLogEntry {
  id: string;
  resident_id: string;
  staff_id: string | null;
  organization_id: string | null;
  interaction_type: InteractionType;
  interaction_source: InteractionSource;
  raw_transcript: string | null;
  audio_recording_url: string | null;
  sentiment_score: number | null;
  detected_concerns: string[];
  location: string | null;
  duration_seconds: number | null;
  interaction_start: string;
  interaction_end: string | null;
  created_at: string;
  processed: boolean;
  documentation_generated: boolean;
  metadata: Record<string, any>;
}

/**
 * Log a care interaction
 * @param interaction - Details of the interaction to log
 * @returns The created interaction log entry
 */
export async function logInteraction(
  interaction: CareInteraction
): Promise<{ data: InteractionLogEntry | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('care_interaction_logs')
      .insert({
        resident_id: interaction.resident_id,
        staff_id: interaction.staff_id || null,
        organization_id: interaction.organization_id || null,
        interaction_type: interaction.interaction_type,
        interaction_source: interaction.interaction_source,
        raw_transcript: interaction.raw_transcript || null,
        audio_recording_url: interaction.audio_recording_url || null,
        sentiment_score: interaction.sentiment_score || null,
        detected_concerns: interaction.detected_concerns || [],
        location: interaction.location || null,
        duration_seconds: interaction.duration_seconds || null,
        interaction_start: interaction.interaction_start || new Date(),
        interaction_end: interaction.interaction_end || null,
        metadata: interaction.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging interaction:', error);
      return { data: null, error };
    }

    return { data: data as InteractionLogEntry, error: null };
  } catch (err) {
    console.error('Exception logging interaction:', err);
    return { data: null, error: err };
  }
}

/**
 * Get interactions for a specific resident
 * @param residentId - ID of the resident
 * @param options - Query options (limit, date range, etc.)
 */
export async function getResidentInteractions(
  residentId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    interactionTypes?: InteractionType[];
  }
) {
  try {
    let query = supabase
      .from('care_interaction_logs')
      .select('*')
      .eq('resident_id', residentId)
      .order('interaction_start', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.startDate) {
      query = query.gte('interaction_start', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('interaction_start', options.endDate.toISOString());
    }

    if (options?.interactionTypes && options.interactionTypes.length > 0) {
      query = query.in('interaction_type', options.interactionTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resident interactions:', error);
      return { data: null, error };
    }

    return { data: data as InteractionLogEntry[], error: null };
  } catch (err) {
    console.error('Exception fetching resident interactions:', err);
    return { data: null, error: err };
  }
}

/**
 * Get interactions for an organization (for staff dashboard)
 * @param organizationId - ID of the organization
 * @param options - Query options
 */
export async function getOrganizationInteractions(
  organizationId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    processed?: boolean;
  }
) {
  try {
    let query = supabase
      .from('care_interaction_logs')
      .select(`
        *,
        users!care_interaction_logs_resident_id_fkey(id, name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('interaction_start', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.startDate) {
      query = query.gte('interaction_start', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('interaction_start', options.endDate.toISOString());
    }

    if (typeof options?.processed === 'boolean') {
      query = query.eq('processed', options.processed);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching organization interactions:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching organization interactions:', err);
    return { data: null, error: err };
  }
}

/**
 * Get today's interaction count for an organization
 * @param organizationId - ID of the organization
 */
export async function getTodayInteractionCount(organizationId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('care_interaction_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('interaction_start', today.toISOString());

    if (error) {
      console.error('Error getting today interaction count:', error);
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (err) {
    console.error('Exception getting today interaction count:', err);
    return { count: 0, error: err };
  }
}

/**
 * Get interaction statistics for an organization
 * @param organizationId - ID of the organization
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 */
export async function getInteractionStats(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const { data, error } = await supabase
      .from('care_interaction_logs')
      .select('interaction_type, interaction_source, processed, documentation_generated')
      .eq('organization_id', organizationId)
      .gte('interaction_start', startDate.toISOString())
      .lte('interaction_start', endDate.toISOString());

    if (error) {
      console.error('Error getting interaction stats:', error);
      return { stats: null, error };
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      byType: {} as Record<InteractionType, number>,
      bySource: {} as Record<InteractionSource, number>,
      processed: data.filter((i) => i.processed).length,
      documentationGenerated: data.filter((i) => i.documentation_generated).length,
      pending: data.filter((i) => !i.processed).length,
    };

    // Count by type
    data.forEach((interaction: any) => {
      const interactionType = interaction.interaction_type as InteractionType;
      const interactionSource = interaction.interaction_source as InteractionSource;

      stats.byType[interactionType] =
        (stats.byType[interactionType] || 0) + 1;
      stats.bySource[interactionSource] =
        (stats.bySource[interactionSource] || 0) + 1;
    });

    return { stats, error: null };
  } catch (err) {
    console.error('Exception getting interaction stats:', err);
    return { stats: null, error: err };
  }
}

/**
 * Mark an interaction as processed
 * @param interactionId - ID of the interaction
 */
export async function markInteractionProcessed(interactionId: string) {
  try {
    const { error } = await supabase
      .from('care_interaction_logs')
      .update({ processed: true })
      .eq('id', interactionId);

    if (error) {
      console.error('Error marking interaction as processed:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Exception marking interaction as processed:', err);
    return { success: false, error: err };
  }
}

/**
 * Mark an interaction as having documentation generated
 * @param interactionId - ID of the interaction
 */
export async function markDocumentationGenerated(interactionId: string) {
  try {
    const { error } = await supabase
      .from('care_interaction_logs')
      .update({ documentation_generated: true, processed: true })
      .eq('id', interactionId);

    if (error) {
      console.error('Error marking documentation generated:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Exception marking documentation generated:', err);
    return { success: false, error: err };
  }
}

/**
 * Update sentiment score for an interaction
 * @param interactionId - ID of the interaction
 * @param sentimentScore - Sentiment score (-1.0 to 1.0)
 */
export async function updateInteractionSentiment(
  interactionId: string,
  sentimentScore: number
) {
  try {
    if (sentimentScore < -1 || sentimentScore > 1) {
      throw new Error('Sentiment score must be between -1.0 and 1.0');
    }

    const { error } = await supabase
      .from('care_interaction_logs')
      .update({ sentiment_score: sentimentScore })
      .eq('id', interactionId);

    if (error) {
      console.error('Error updating sentiment score:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Exception updating sentiment score:', err);
    return { success: false, error: err };
  }
}

/**
 * Add detected concerns to an interaction
 * @param interactionId - ID of the interaction
 * @param concerns - Array of concern keywords
 */
export async function addInteractionConcerns(
  interactionId: string,
  concerns: string[]
) {
  try {
    // Get current concerns
    const { data: interaction } = await supabase
      .from('care_interaction_logs')
      .select('detected_concerns')
      .eq('id', interactionId)
      .single();

    if (!interaction) {
      throw new Error('Interaction not found');
    }

    // Merge with new concerns (remove duplicates)
    const allConcerns = [
      ...(interaction.detected_concerns || []),
      ...concerns,
    ];
    const uniqueConcerns = Array.from(new Set(allConcerns));

    const { error } = await supabase
      .from('care_interaction_logs')
      .update({ detected_concerns: uniqueConcerns })
      .eq('id', interactionId);

    if (error) {
      console.error('Error adding interaction concerns:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Exception adding interaction concerns:', err);
    return { success: false, error: err };
  }
}

/**
 * Delete interactions older than retention period
 * (Should be called by a cron job)
 * @param organizationId - ID of the organization
 * @param retentionDays - Number of days to retain interactions
 */
export async function cleanupOldInteractions(
  organizationId: string,
  retentionDays: number
) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { error } = await supabase
      .from('care_interaction_logs')
      .delete()
      .eq('organization_id', organizationId)
      .lt('interaction_start', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up old interactions:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Exception cleaning up old interactions:', err);
    return { success: false, error: err };
  }
}
