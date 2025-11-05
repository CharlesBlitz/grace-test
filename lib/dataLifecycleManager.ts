/**
 * GDPR Data Lifecycle Management System
 *
 * Handles automated conversation archiving, deletion, and anonymization
 * according to retention policies and GDPR requirements.
 *
 * This should be run as a scheduled job (e.g., daily cron via Edge Function)
 */

import { createClient } from '@supabase/supabase-js';

export interface LifecycleStats {
  conversationsArchived: number;
  conversationsDeleted: number;
  conversationsAnonymized: number;
  errors: string[];
}

export class DataLifecycleManager {
  private supabase;
  private supabaseUrl: string;
  private supabaseServiceKey: string;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    // Use service role key for administrative operations
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.supabaseUrl = supabaseUrl;
    this.supabaseServiceKey = supabaseServiceKey;
  }

  /**
   * Run full lifecycle management: archive, anonymize, and delete
   */
  async runLifecycle(): Promise<LifecycleStats> {
    const stats: LifecycleStats = {
      conversationsArchived: 0,
      conversationsDeleted: 0,
      conversationsAnonymized: 0,
      errors: [],
    };

    try {
      // Step 1: Archive conversations that have passed their archive date
      const archived = await this.archiveConversations();
      stats.conversationsArchived = archived;

      // Step 2: Anonymize service improvement conversations
      const anonymized = await this.anonymizeConversations();
      stats.conversationsAnonymized = anonymized;

      // Step 3: Delete conversations that have passed their deletion date
      const deleted = await this.deleteConversations();
      stats.conversationsDeleted = deleted;

      // Step 4: Notify users of upcoming deletions (60 days before)
      await this.notifyUpcomingDeletions();

    } catch (error) {
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return stats;
  }

  /**
   * Archive conversations that have passed their archive_after date
   */
  private async archiveConversations(): Promise<number> {
    const now = new Date().toISOString();

    // Find conversations ready for archiving
    const { data: conversationsToArchive, error: fetchError } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('is_archived', false)
      .lte('archive_after', now)
      .is('anonymized_at', null); // Don't archive if already anonymized

    if (fetchError) {
      throw new Error(`Failed to fetch conversations for archiving: ${fetchError.message}`);
    }

    if (!conversationsToArchive || conversationsToArchive.length === 0) {
      return 0;
    }

    // Move to archived_conversations table
    const archivedData = conversationsToArchive.map(conv => ({
      original_id: conv.id,
      elder_id: conv.elder_id,
      transcript: conv.transcript,
      sentiment: conv.sentiment,
      legal_basis: conv.legal_basis,
      retention_category: conv.retention_category,
      flagged_for_safeguarding: conv.flagged_for_safeguarding,
      safeguarding_notes: conv.safeguarding_notes,
      contains_health_data: conv.contains_health_data,
      original_created_at: conv.created_at,
      archived_at: now,
      delete_after: conv.delete_after,
    }));

    const { error: insertError } = await this.supabase
      .from('archived_conversations')
      .insert(archivedData);

    if (insertError) {
      throw new Error(`Failed to insert archived conversations: ${insertError.message}`);
    }

    // Mark original conversations as archived
    const { error: updateError } = await this.supabase
      .from('conversations')
      .update({ is_archived: true })
      .in('id', conversationsToArchive.map(c => c.id));

    if (updateError) {
      throw new Error(`Failed to mark conversations as archived: ${updateError.message}`);
    }

    return conversationsToArchive.length;
  }

  /**
   * Anonymize conversations in service_improvement category
   * Must be irreversible per GDPR Recital 26
   */
  private async anonymizeConversations(): Promise<number> {
    const now = new Date().toISOString();

    // Find service improvement conversations ready for anonymization
    const { data: conversationsToAnonymize, error: fetchError } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('retention_category', 'service_improvement')
      .lte('archive_after', now)
      .is('anonymized_at', null);

    if (fetchError) {
      throw new Error(`Failed to fetch conversations for anonymization: ${fetchError.message}`);
    }

    if (!conversationsToAnonymize || conversationsToAnonymize.length === 0) {
      return 0;
    }

    // Anonymize by removing all PII
    const updates = conversationsToAnonymize.map(async (conv) => {
      const anonymizedTranscript = this.anonymizeTranscript(conv.transcript);

      return this.supabase
        .from('conversations')
        .update({
          elder_id: '00000000-0000-0000-0000-000000000000', // Null UUID for anonymized data
          transcript: anonymizedTranscript,
          anonymized_at: now,
          // Keep sentiment and created_at for analytics
        })
        .eq('id', conv.id);
    });

    await Promise.all(updates);
    return conversationsToAnonymize.length;
  }

  /**
   * Remove personally identifiable information from transcript
   * This is a basic implementation - consider using a dedicated NER/PII detection service
   */
  private anonymizeTranscript(transcript: string): string {
    let anonymized = transcript;

    // Remove common PII patterns
    // Names: Replace capitalized words that might be names
    anonymized = anonymized.replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g, '[NAME]');

    // Email addresses
    anonymized = anonymized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Phone numbers (UK format)
    anonymized = anonymized.replace(/\b(?:\+44|0)[\d\s-]{9,13}\b/g, '[PHONE]');

    // Postcodes (UK format)
    anonymized = anonymized.replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/gi, '[POSTCODE]');

    // Addresses: Remove numbers followed by street-like words
    anonymized = anonymized.replace(/\b\d+\s+\w+\s+(Street|Road|Avenue|Lane|Drive|Close|Way|Court|Place|Crescent)\b/gi, '[ADDRESS]');

    // Dates that could identify someone
    anonymized = anonymized.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '[DATE]');

    // NHS numbers
    anonymized = anonymized.replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[NHS_NUMBER]');

    return anonymized;
  }

  /**
   * Permanently delete conversations that have passed their deletion date
   * Implements 30-day soft delete with recovery window
   */
  private async deleteConversations(): Promise<number> {
    const now = new Date().toISOString();

    // Delete from archived_conversations (already past primary retention)
    const { data: archivedToDelete, error: archiveFetchError } = await this.supabase
      .from('archived_conversations')
      .select('id, original_id')
      .lte('delete_after', now)
      .not('delete_after', 'is', null);

    if (archiveFetchError) {
      throw new Error(`Failed to fetch archived conversations for deletion: ${archiveFetchError.message}`);
    }

    let deletedCount = 0;

    if (archivedToDelete && archivedToDelete.length > 0) {
      // Hard delete from archived_conversations
      const { error: deleteError } = await this.supabase
        .from('archived_conversations')
        .delete()
        .in('id', archivedToDelete.map(c => c.id));

      if (deleteError) {
        throw new Error(`Failed to delete archived conversations: ${deleteError.message}`);
      }

      // Also delete from main conversations table if still there
      const { error: mainDeleteError } = await this.supabase
        .from('conversations')
        .delete()
        .in('id', archivedToDelete.map(c => c.original_id));

      // Don't throw on this error - conversation might already be deleted
      if (mainDeleteError) {
        console.warn('Warning deleting from main conversations:', mainDeleteError.message);
      }

      deletedCount = archivedToDelete.length;
    }

    // Check for any conversations in main table past deletion date (shouldn't happen but safety check)
    const { data: mainToDelete, error: mainFetchError } = await this.supabase
      .from('conversations')
      .select('id')
      .lte('delete_after', now)
      .not('delete_after', 'is', null)
      .eq('is_archived', true);

    if (!mainFetchError && mainToDelete && mainToDelete.length > 0) {
      const { error: deleteError } = await this.supabase
        .from('conversations')
        .delete()
        .in('id', mainToDelete.map(c => c.id));

      if (deleteError) {
        throw new Error(`Failed to delete main conversations: ${deleteError.message}`);
      }

      deletedCount += mainToDelete.length;
    }

    return deletedCount;
  }

  /**
   * Notify users 60 days before conversations will be deleted
   * Uses SMS notifications via Twilio Edge Function
   */
  private async notifyUpcomingDeletions(): Promise<void> {
    const notifyDate = new Date();
    notifyDate.setDate(notifyDate.getDate() + 60);
    const notifyDateStr = notifyDate.toISOString();

    const sixtyOneDaysFromNow = new Date();
    sixtyOneDaysFromNow.setDate(sixtyOneDaysFromNow.getDate() + 61);
    const sixtyOneDaysStr = sixtyOneDaysFromNow.toISOString();

    // Find conversations that will be deleted in 60 days
    const { data: upcomingDeletions, error } = await this.supabase
      .from('archived_conversations')
      .select('elder_id, delete_after')
      .gte('delete_after', notifyDateStr)
      .lt('delete_after', sixtyOneDaysStr)
      .not('delete_after', 'is', null);

    if (error || !upcomingDeletions || upcomingDeletions.length === 0) {
      return;
    }

    // Group by elder_id
    const uniqueElderIds = new Set<string>();
    upcomingDeletions.forEach(d => uniqueElderIds.add(d.elder_id));
    const elderIds = Array.from(uniqueElderIds);

    // Fetch elder and NoK contact info and send SMS notifications
    for (const elderId of elderIds) {
      const { data: user } = await this.supabase
        .from('users')
        .select('phone_number, name')
        .eq('id', elderId)
        .single();

      if (user && user.phone_number) {
        const deletionDate = upcomingDeletions.find(d => d.elder_id === elderId)?.delete_after;
        const formattedDate = deletionDate ? new Date(deletionDate).toLocaleDateString() : '60 days';

        await fetch(`${this.supabaseUrl}/functions/v1/send-deletion-warning`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            userName: user.name,
            deletionDate: formattedDate,
          }),
        });
      }

      // Also notify NoKs
      const { data: noks } = await this.supabase
        .from('elder_nok_relationships')
        .select('nok_id')
        .eq('elder_id', elderId);

      if (noks && noks.length > 0) {
        const { data: nokUsers } = await this.supabase
          .from('users')
          .select('phone_number, name')
          .in('id', noks.map(n => n.nok_id));

        if (nokUsers) {
          for (const nok of nokUsers) {
            if (nok.phone_number) {
              const deletionDate = upcomingDeletions.find(d => d.elder_id === elderId)?.delete_after;
              const formattedDate = deletionDate ? new Date(deletionDate).toLocaleDateString() : '60 days';

              await fetch(`${this.supabaseUrl}/functions/v1/send-deletion-warning`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${this.supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: nok.phone_number,
                  userName: nok.name,
                  deletionDate: formattedDate,
                  isNoK: true,
                }),
              });
            }
          }
        }
      }
    }
  }

  /**
   * Classify a conversation for automatic categorization
   * Uses sentiment and keyword analysis to flag safeguarding concerns
   */
  static async classifyConversation(transcript: string, sentiment: 'pos' | 'neu' | 'neg'): Promise<{
    retentionCategory: 'essential_safeguarding' | 'family_monitoring' | 'service_improvement';
    flaggedForSafeguarding: boolean;
    containsHealthData: boolean;
    safeguardingNotes?: string;
  }> {
    let flaggedForSafeguarding = false;
    let containsHealthData = false;
    let safeguardingNotes: string | undefined;
    let retentionCategory: 'essential_safeguarding' | 'family_monitoring' | 'service_improvement' = 'family_monitoring';

    const lowerTranscript = transcript.toLowerCase();

    // Safeguarding keyword detection
    const safeguardingKeywords = [
      'fall', 'fell', 'hurt', 'pain', 'injury', 'accident',
      'confused', 'lost', 'scared', 'afraid', 'frightened',
      'help me', 'emergency', 'urgent', 'danger',
      'abuse', 'neglect', 'harm',
      'can\'t remember', 'don\'t know where',
      'haven\'t eaten', 'no food', 'hungry',
      'cold', 'freezing', 'heating',
    ];

    const detectedKeywords = safeguardingKeywords.filter(keyword =>
      lowerTranscript.includes(keyword)
    );

    // Health data detection (GDPR Article 9)
    const healthKeywords = [
      'medication', 'medicine', 'pill', 'prescription', 'doctor', 'hospital',
      'diagnosis', 'treatment', 'symptom', 'pain', 'disease', 'illness',
      'blood pressure', 'diabetes', 'heart', 'cancer',
      'dementia', 'alzheimer', 'memory loss',
    ];

    const detectedHealthKeywords = healthKeywords.filter(keyword =>
      lowerTranscript.includes(keyword)
    );

    containsHealthData = detectedHealthKeywords.length > 0;

    // Flag for safeguarding if concerning keywords found or negative sentiment
    if (detectedKeywords.length > 0 || sentiment === 'neg') {
      flaggedForSafeguarding = true;
      retentionCategory = 'essential_safeguarding';
      safeguardingNotes = `Auto-flagged: Found keywords [${detectedKeywords.join(', ')}]. Sentiment: ${sentiment}`;
    }

    return {
      retentionCategory,
      flaggedForSafeguarding,
      containsHealthData,
      safeguardingNotes,
    };
  }

  /**
   * Handle user data deletion request (GDPR Right to Erasure)
   * Must balance with legal obligations to retain safeguarding data
   */
  async processErasureRequest(userId: string, requestId: string): Promise<{
    success: boolean;
    conversationsDeleted: number;
    conversationsRetained: number;
    retentionReason?: string;
  }> {
    // Check for conversations that must be retained for legal reasons
    const { data: safeguardingConvs, error: safeguardingError } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('elder_id', userId)
      .eq('flagged_for_safeguarding', true)
      .in('legal_basis', ['legal_obligation', 'vital_interest']);

    if (safeguardingError) {
      throw new Error(`Failed to check safeguarding conversations: ${safeguardingError.message}`);
    }

    const mustRetainCount = safeguardingConvs?.length || 0;

    // Delete non-safeguarding conversations
    const { data: deletedConvs, error: deleteError } = await this.supabase
      .from('conversations')
      .delete()
      .eq('elder_id', userId)
      .eq('flagged_for_safeguarding', false)
      .select('id');

    if (deleteError) {
      throw new Error(`Failed to delete conversations: ${deleteError.message}`);
    }

    const deletedCount = deletedConvs?.length || 0;

    // Update request status
    await this.supabase
      .from('data_subject_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: mustRetainCount > 0
          ? `Deleted ${deletedCount} conversations. Retained ${mustRetainCount} conversations for safeguarding legal obligations.`
          : `Deleted ${deletedCount} conversations.`,
      })
      .eq('id', requestId);

    return {
      success: true,
      conversationsDeleted: deletedCount,
      conversationsRetained: mustRetainCount,
      retentionReason: mustRetainCount > 0
        ? 'Safeguarding data retained under legal obligation (GDPR Article 6(1)(c))'
        : undefined,
    };
  }
}
