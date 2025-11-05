/**
 * Signature Capture System
 *
 * Handles electronic and voice signature capture with legal compliance
 * Supports multiple signature methods suitable for elderly and vulnerable users
 */

import { supabase } from './supabaseClient';

export interface SignatureMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    timezone?: string;
  };
  timestamp: string;
}

export interface ElectronicSignatureData {
  signatureType: 'electronic_checkbox' | 'drawn_signature';
  signatoryName: string;
  signatoryStatement: string;
  drawingData?: string; // Base64 encoded image or SVG path
  metadata: SignatureMetadata;
}

export interface VoiceSignatureData {
  signatureType: 'voice_signature' | 'biometric_voice';
  signatoryName: string;
  signatoryStatement: string;
  audioBlob: Blob;
  transcription?: string;
  audioDuration: number;
  metadata: SignatureMetadata;
}

export interface GuardianSignatureData {
  signatureType: 'guardian_signature';
  signatoryName: string;
  signatoryStatement: string;
  witnessName?: string;
  witnessRelationship?: string;
  onBehalfOfUserId: string;
  guardianshipEvidence?: string;
  metadata: SignatureMetadata;
}

export class SignatureCapture {
  /**
   * Capture browser metadata for signature verification
   */
  static async captureMetadata(): Promise<SignatureMetadata> {
    const metadata: SignatureMetadata = {
      userAgent: navigator.userAgent,
      deviceFingerprint: await this.generateDeviceFingerprint(),
      location: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      timestamp: new Date().toISOString(),
    };

    // Try to get IP address (would need backend endpoint)
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      metadata.ipAddress = data.ip;
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
    }

    return metadata;
  }

  /**
   * Generate a device fingerprint for fraud prevention
   */
  private static async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.width + 'x' + screen.height,
      screen.colorDepth.toString(),
      navigator.hardwareConcurrency?.toString() || 'unknown',
    ];

    const fingerprint = components.join('|');

    // Create a simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Save electronic checkbox signature
   */
  static async saveElectronicSignature(
    userId: string,
    documentId: string,
    data: ElectronicSignatureData
  ): Promise<{ success: boolean; signatureId?: string; error?: string }> {
    try {
      // Get document hash
      const { data: document } = await supabase
        .from('consent_documents')
        .select('content_hash')
        .eq('id', documentId)
        .single();

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Prepare signature data
      const signatureData: any = {
        drawing_data: data.drawingData,
      };

      // Insert signature record
      const { data: signature, error } = await supabase
        .from('consent_signatures')
        .insert({
          user_id: userId,
          document_id: documentId,
          signature_type: data.signatureType,
          signature_method: data.signatureType === 'drawn_signature' ? 'web_canvas_draw' : 'web_checkbox',
          signatory_name: data.signatoryName,
          signatory_statement: data.signatoryStatement,
          signature_data: signatureData,
          signed_at: data.metadata.timestamp,
          ip_address: data.metadata.ipAddress,
          user_agent: data.metadata.userAgent,
          device_fingerprint: data.metadata.deviceFingerprint,
          location_data: data.metadata.location,
          document_hash_at_signing: document.content_hash,
          is_verified: true, // Electronic signatures are immediately verified
          verification_method: 'authenticated_session',
          verified_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Log verification
      await this.logVerification(signature.id, 'initial_capture', 'passed', {
        method: data.signatureType,
        captured_at: data.metadata.timestamp,
      });

      return { success: true, signatureId: signature.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save voice signature with audio recording
   */
  static async saveVoiceSignature(
    userId: string,
    documentId: string,
    data: VoiceSignatureData
  ): Promise<{ success: boolean; signatureId?: string; error?: string }> {
    try {
      // Get document hash
      const { data: document } = await supabase
        .from('consent_documents')
        .select('content_hash')
        .eq('id', documentId)
        .single();

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Upload audio to Supabase Storage
      const audioFileName = `voice-signatures/${userId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(audioFileName, data.audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '31536000', // 1 year
        });

      if (uploadError) {
        return { success: false, error: `Audio upload failed: ${uploadError.message}` };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(audioFileName);

      // Insert signature record
      const { data: signature, error } = await supabase
        .from('consent_signatures')
        .insert({
          user_id: userId,
          document_id: documentId,
          signature_type: data.signatureType,
          signature_method: 'voice_recording',
          signatory_name: data.signatoryName,
          signatory_statement: data.signatoryStatement,
          signature_data: {
            audio_url: urlData.publicUrl,
            audio_duration: data.audioDuration,
          },
          signed_at: data.metadata.timestamp,
          ip_address: data.metadata.ipAddress,
          user_agent: data.metadata.userAgent,
          device_fingerprint: data.metadata.deviceFingerprint,
          location_data: data.metadata.location,
          document_hash_at_signing: document.content_hash,
          is_verified: false, // Voice signatures require transcription verification
          verification_method: 'pending_transcription',
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Insert voice recording details
      const { error: voiceError } = await supabase
        .from('voice_signature_recordings')
        .insert({
          signature_id: signature.id,
          audio_file_path: audioFileName,
          audio_duration_seconds: data.audioDuration,
          audio_format: 'webm',
          audio_size_bytes: data.audioBlob.size,
          transcription: data.transcription || 'Pending transcription',
          transcription_confidence: data.transcription ? 1.0 : 0.0,
          recording_started_at: data.metadata.timestamp,
          recording_ended_at: new Date().toISOString(),
          recording_device: data.metadata.userAgent,
          is_encrypted: false, // Would need additional encryption implementation
        });

      if (voiceError) {
        console.error('Voice recording details insert failed:', voiceError);
      }

      // Log verification
      await this.logVerification(signature.id, 'initial_capture', 'pending', {
        method: 'voice_recording',
        requires_transcription: !data.transcription,
      });

      return { success: true, signatureId: signature.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save guardian signature on behalf of elder
   */
  static async saveGuardianSignature(
    guardianUserId: string,
    documentId: string,
    data: GuardianSignatureData
  ): Promise<{ success: boolean; signatureId?: string; error?: string }> {
    try {
      // Verify guardian relationship
      const { data: relationship } = await supabase
        .from('elder_nok_relationships')
        .select('*')
        .eq('nok_id', guardianUserId)
        .eq('elder_id', data.onBehalfOfUserId)
        .eq('can_modify_settings', true)
        .single();

      if (!relationship) {
        return { success: false, error: 'Guardian relationship not verified' };
      }

      // Get document hash
      const { data: document } = await supabase
        .from('consent_documents')
        .select('content_hash')
        .eq('id', documentId)
        .single();

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Insert signature record
      const { data: signature, error } = await supabase
        .from('consent_signatures')
        .insert({
          user_id: guardianUserId,
          document_id: documentId,
          signature_type: 'guardian_signature',
          signature_method: 'guardian_web_signature',
          signatory_name: data.signatoryName,
          signatory_statement: data.signatoryStatement,
          signature_data: {
            guardianship_evidence: data.guardianshipEvidence,
          },
          signed_at: data.metadata.timestamp,
          ip_address: data.metadata.ipAddress,
          user_agent: data.metadata.userAgent,
          device_fingerprint: data.metadata.deviceFingerprint,
          location_data: data.metadata.location,
          document_hash_at_signing: document.content_hash,
          is_guardian_signature: true,
          on_behalf_of_user: data.onBehalfOfUserId,
          witness_name: data.witnessName,
          witness_relationship: data.witnessRelationship,
          is_verified: true,
          verification_method: 'guardian_relationship_verified',
          verified_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Log verification
      await this.logVerification(signature.id, 'initial_capture', 'passed', {
        method: 'guardian_signature',
        relationship_id: relationship.id,
      });

      return { success: true, signatureId: signature.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Withdraw consent by updating signature record
   */
  static async withdrawConsent(
    signatureId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('consent_signatures')
        .update({
          consent_given: false,
          consent_withdrawn_at: new Date().toISOString(),
          withdrawal_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', signatureId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log withdrawal
      await this.logVerification(signatureId, 'admin_review', 'passed', {
        action: 'consent_withdrawn',
        reason,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify voice signature transcription
   */
  static async verifyVoiceTranscription(
    signatureId: string,
    transcription: string,
    confidence: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update voice recording with transcription
      const { error: voiceError } = await supabase
        .from('voice_signature_recordings')
        .update({
          transcription,
          transcription_confidence: confidence,
        })
        .eq('signature_id', signatureId);

      if (voiceError) {
        return { success: false, error: voiceError.message };
      }

      // Update signature verification status
      const verified = confidence >= 0.8;
      const { error: sigError } = await supabase
        .from('consent_signatures')
        .update({
          is_verified: verified,
          verification_method: 'voice_transcription',
          verified_at: verified ? new Date().toISOString() : null,
        })
        .eq('id', signatureId);

      if (sigError) {
        return { success: false, error: sigError.message };
      }

      // Log verification
      await this.logVerification(
        signatureId,
        'voice_biometric',
        verified ? 'passed' : 'requires_review',
        {
          transcription_confidence: confidence,
          transcription_text: transcription,
        }
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log signature verification attempt
   */
  private static async logVerification(
    signatureId: string,
    verificationType: string,
    status: string,
    data: any
  ): Promise<void> {
    try {
      await supabase.from('signature_verification_logs').insert({
        signature_id: signatureId,
        verification_type: verificationType,
        verification_status: status,
        verification_data: data,
        attempted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        verified_by_system: 'signature_capture_library',
      });
    } catch (error) {
      console.error('Failed to log verification:', error);
    }
  }

  /**
   * Get signature details for display
   */
  static async getSignatureDetails(signatureId: string): Promise<any> {
    const { data, error } = await supabase
      .from('consent_signatures')
      .select(`
        *,
        consent_documents (*),
        voice_signature_recordings (*),
        signature_verification_logs (*)
      `)
      .eq('id', signatureId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch signature: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all signatures for a user
   */
  static async getUserSignatures(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('consent_signatures')
      .select(`
        *,
        consent_documents (document_type, title, version)
      `)
      .eq('user_id', userId)
      .order('signed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch signatures: ${error.message}`);
    }

    return data || [];
  }
}
