/*
  # Electronic and Voice Signature System

  ## Legal Framework - UK Electronic Signatures

  Under UK law (Electronic Communications Act 2000 and eIDAS Regulation UK):

  1. **Simple Electronic Signatures** - Legally binding for most purposes
     - Includes: Typed name, checkbox consent, click-to-accept
     - Valid unless specifically excluded by law
     - Must demonstrate: Intent to sign, identity of signatory, document integrity

  2. **Voice Signatures** - Legally valid as electronic signatures
     - Voice recording expressing consent is admissible evidence
     - Must be: Clear, unambiguous, recorded with timestamp
     - Particularly appropriate for vulnerable/elderly users
     - Courts have accepted voice recordings as evidence of agreement

  3. **Requirements for Validity**
     - Signatory identity verification (authentication)
     - Clear indication of what is being signed
     - Timestamp of signature
     - Audit trail showing signature was genuine and voluntary
     - Prevention of tampering (document hash/checksum)
     - Retention of signature evidence

  ## Changes Made

  1. **New Table: consent_signatures**
     - Records all consent signatures (electronic and voice)
     - Stores signature type, method, evidence, and verification data
     - Immutable audit trail for legal compliance
     - Links to specific consent documents/versions

  2. **New Table: consent_documents**
     - Version-controlled consent documents
     - Each document has unique hash for integrity verification
     - Tracks what user agreed to at time of signing
     - Required for demonstrating informed consent

  3. **New Table: signature_verification_logs**
     - Records signature verification attempts
     - IP address, device fingerprint, location data
     - Multi-factor authentication checks
     - Identity verification evidence

  4. **New Table: voice_signature_recordings**
     - Stores voice signature audio files securely
     - Encrypted storage with access controls
     - Transcription of spoken consent
     - Voice biometric data (optional, for verification)

  5. **Enhanced Tables**
     - users: Add signature_method_preference
     - data_subject_requests: Link to signatures for audit

  ## Signature Types Supported

  **Type 1: Electronic Checkbox Signature**
  - User checks box and types name
  - Browser fingerprint + IP address captured
  - Click timestamp recorded
  - Suitable for: Standard consent forms

  **Type 2: Voice Signature**
  - User verbally states consent
  - Audio recorded and encrypted
  - Transcribed to text for verification
  - Timestamp and metadata captured
  - Suitable for: Elderly users, accessibility needs

  **Type 3: Electronic Draw Signature**
  - User draws signature with mouse/touch
  - Signature image stored as SVG/PNG
  - Drawing metadata captured (timing, pressure)
  - Suitable for: Traditional preference users

  **Type 4: Biometric Voice Signature**
  - Voice recording + voiceprint analysis
  - Enhanced security for high-value consent
  - Suitable for: Guardian consent, legal authority

  ## Important Notes
  - All signatures are legally binding under UK law
  - Voice signatures particularly appropriate for dementia care
  - Audit trail is critical for demonstrating validity
  - Must be able to prove: who signed, what they signed, when, and that it was voluntary
  - GDPR compliant: Signature data is special category requiring explicit consent
*/

-- Create consent_documents table (version-controlled documents)
CREATE TABLE IF NOT EXISTS consent_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN (
    'terms_of_service',
    'privacy_policy',
    'data_processing_agreement',
    'wellbeing_monitoring_consent',
    'family_access_consent',
    'analytics_consent',
    'voice_cloning_consent',
    'guardian_authority_declaration',
    'nok_registration_consent'
  )),
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL, -- SHA-256 hash for integrity verification
  effective_date timestamptz NOT NULL,
  superseded_date timestamptz,
  is_current boolean DEFAULT true,
  requires_signature boolean DEFAULT true,
  language text DEFAULT 'en-GB',
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_type, version)
);

ALTER TABLE consent_documents ENABLE ROW LEVEL SECURITY;

-- Create consent_signatures table (all signature records)
CREATE TABLE IF NOT EXISTS consent_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES consent_documents(id),

  -- Signature details
  signature_type text NOT NULL CHECK (signature_type IN (
    'electronic_checkbox',
    'voice_signature',
    'drawn_signature',
    'biometric_voice',
    'guardian_signature'
  )),
  signature_method text NOT NULL, -- e.g., "web_checkbox", "voice_recording", "touch_draw"

  -- Evidence and verification
  signatory_name text NOT NULL,
  signatory_statement text, -- What they agreed to (e.g., "I consent to...")
  signature_data jsonb, -- Stores signature-specific data (audio URL, image URL, etc.)

  -- Audit trail
  signed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  location_data jsonb, -- Country, timezone for verification

  -- Verification status
  is_verified boolean DEFAULT false,
  verification_method text, -- e.g., "email_confirm", "sms_verify", "voice_match"
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id),

  -- Legal metadata
  consent_given boolean DEFAULT true,
  consent_withdrawn_at timestamptz,
  withdrawal_reason text,
  witness_name text, -- For guardian signatures
  witness_relationship text,

  -- Document integrity
  document_hash_at_signing text NOT NULL, -- Hash of document at time of signing

  -- Special handling
  is_guardian_signature boolean DEFAULT false,
  on_behalf_of_user uuid REFERENCES users(id), -- If signing for someone else

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE consent_signatures ENABLE ROW LEVEL SECURITY;

-- Create voice_signature_recordings table
CREATE TABLE IF NOT EXISTS voice_signature_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES consent_signatures(id) ON DELETE CASCADE,

  -- Audio recording details
  audio_file_path text NOT NULL, -- Path in Supabase Storage
  audio_duration_seconds numeric,
  audio_format text DEFAULT 'webm',
  audio_size_bytes integer,

  -- Transcription
  transcription text NOT NULL,
  transcription_confidence numeric, -- 0.0 to 1.0
  transcription_language text DEFAULT 'en-GB',

  -- Voice biometrics (optional)
  voiceprint_data jsonb, -- Voice characteristics for verification
  voice_match_score numeric, -- Similarity to known voice samples

  -- Recording metadata
  recording_started_at timestamptz,
  recording_ended_at timestamptz,
  recording_device text,
  background_noise_level text, -- quiet, moderate, noisy

  -- Security
  is_encrypted boolean DEFAULT true,
  encryption_key_id text,

  created_at timestamptz DEFAULT now(),
  UNIQUE(signature_id)
);

ALTER TABLE voice_signature_recordings ENABLE ROW LEVEL SECURITY;

-- Create signature_verification_logs table
CREATE TABLE IF NOT EXISTS signature_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES consent_signatures(id) ON DELETE CASCADE,

  -- Verification attempt
  verification_type text NOT NULL CHECK (verification_type IN (
    'initial_capture',
    'email_verification',
    'sms_verification',
    'voice_biometric',
    'admin_review',
    'automated_fraud_check'
  )),
  verification_status text NOT NULL CHECK (verification_status IN (
    'pending',
    'passed',
    'failed',
    'requires_review'
  )),

  -- Verification details
  verification_data jsonb, -- Details specific to verification type
  risk_score numeric, -- 0.0 (safe) to 1.0 (high risk)
  risk_factors text[], -- Array of detected risk factors

  -- Verifier information
  verified_by_user uuid REFERENCES users(id),
  verified_by_system text, -- Name of automated system

  -- Timestamps
  attempted_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  notes text
);

ALTER TABLE signature_verification_logs ENABLE ROW LEVEL SECURITY;

-- Add signature preference to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'signature_method_preference'
  ) THEN
    ALTER TABLE users ADD COLUMN signature_method_preference text DEFAULT 'electronic_checkbox'
      CHECK (signature_method_preference IN ('electronic_checkbox', 'voice_signature', 'drawn_signature'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'requires_guardian_signature'
  ) THEN
    ALTER TABLE users ADD COLUMN requires_guardian_signature boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'signature_language_preference'
  ) THEN
    ALTER TABLE users ADD COLUMN signature_language_preference text DEFAULT 'en-GB';
  END IF;
END $$;

-- RLS Policies for consent_documents

-- Anyone can view current consent documents (transparency requirement)
CREATE POLICY "Anyone can view current consent documents"
  ON consent_documents FOR SELECT
  TO authenticated
  USING (is_current = true);

-- Users can view historical documents they signed
CREATE POLICY "Users can view documents they signed"
  ON consent_documents FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT document_id FROM consent_signatures WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for consent_signatures

-- Users can view their own signatures
CREATE POLICY "Users can view own signatures"
  ON consent_signatures FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own signatures
CREATE POLICY "Users can create own signatures"
  ON consent_signatures FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NoKs can view signatures of elders they care for
CREATE POLICY "NoKs can view elder signatures"
  ON consent_signatures FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- Guardians can create signatures on behalf of elders
CREATE POLICY "Guardians can create signatures for elders"
  ON consent_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    is_guardian_signature = true
    AND on_behalf_of_user IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
      AND can_modify_settings = true
    )
  );

-- Users can withdraw their own consent
CREATE POLICY "Users can withdraw own consent"
  ON consent_signatures FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for voice_signature_recordings

-- Users can view their own voice signatures
CREATE POLICY "Users can view own voice signatures"
  ON voice_signature_recordings FOR SELECT
  TO authenticated
  USING (
    signature_id IN (
      SELECT id FROM consent_signatures WHERE user_id = auth.uid()
    )
  );

-- System can insert voice recordings
CREATE POLICY "System can insert voice recordings"
  ON voice_signature_recordings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NoKs can view voice signatures of their elders
CREATE POLICY "NoKs can view elder voice signatures"
  ON voice_signature_recordings FOR SELECT
  TO authenticated
  USING (
    signature_id IN (
      SELECT cs.id FROM consent_signatures cs
      JOIN elder_nok_relationships enr ON cs.user_id = enr.elder_id
      WHERE enr.nok_id = auth.uid()
    )
  );

-- RLS Policies for signature_verification_logs

-- Users can view verification logs for their signatures
CREATE POLICY "Users can view own verification logs"
  ON signature_verification_logs FOR SELECT
  TO authenticated
  USING (
    signature_id IN (
      SELECT id FROM consent_signatures WHERE user_id = auth.uid()
    )
  );

-- System can insert verification logs
CREATE POLICY "System can insert verification logs"
  ON signature_verification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_documents_type_current
  ON consent_documents(document_type, is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_consent_signatures_user
  ON consent_signatures(user_id, signed_at);

CREATE INDEX IF NOT EXISTS idx_consent_signatures_document
  ON consent_signatures(document_id, signed_at);

CREATE INDEX IF NOT EXISTS idx_consent_signatures_type
  ON consent_signatures(signature_type, is_verified);

CREATE INDEX IF NOT EXISTS idx_consent_signatures_guardian
  ON consent_signatures(on_behalf_of_user, is_guardian_signature)
  WHERE is_guardian_signature = true;

CREATE INDEX IF NOT EXISTS idx_voice_recordings_signature
  ON voice_signature_recordings(signature_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_signature
  ON signature_verification_logs(signature_id, verification_status);

-- Create function to generate document hash
CREATE OR REPLACE FUNCTION generate_document_hash(content text)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to validate signature
CREATE OR REPLACE FUNCTION validate_signature(sig_id uuid)
RETURNS boolean AS $$
DECLARE
  sig_record RECORD;
  doc_record RECORD;
BEGIN
  -- Get signature record
  SELECT * INTO sig_record FROM consent_signatures WHERE id = sig_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get document record
  SELECT * INTO doc_record FROM consent_documents WHERE id = sig_record.document_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verify document hash matches
  IF sig_record.document_hash_at_signing != doc_record.content_hash THEN
    RETURN false;
  END IF;

  -- Signature is valid
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Insert initial consent documents
INSERT INTO consent_documents (document_type, version, title, content, content_hash, effective_date)
VALUES
(
  'terms_of_service',
  '1.0',
  'Terms of Service',
  'Grace Companion Terms of Service v1.0 - Full content here...',
  generate_document_hash('Grace Companion Terms of Service v1.0 - Full content here...'),
  now()
),
(
  'privacy_policy',
  '1.0',
  'Privacy Policy',
  'Grace Companion Privacy Policy v1.0 - Full content here...',
  generate_document_hash('Grace Companion Privacy Policy v1.0 - Full content here...'),
  now()
),
(
  'wellbeing_monitoring_consent',
  '1.0',
  'Wellbeing Monitoring Consent',
  'I consent to Grace Companion storing and analyzing my conversations for wellbeing monitoring purposes.',
  generate_document_hash('I consent to Grace Companion storing and analyzing my conversations for wellbeing monitoring purposes.'),
  now()
),
(
  'family_access_consent',
  '1.0',
  'Family Access Consent',
  'I consent to designated family members (Next of Kin) viewing my conversation summaries and wellbeing status.',
  generate_document_hash('I consent to designated family members (Next of Kin) viewing my conversation summaries and wellbeing status.'),
  now()
),
(
  'analytics_consent',
  '1.0',
  'Analytics Consent',
  'I consent to my conversation data being anonymized and used for service improvement.',
  generate_document_hash('I consent to my conversation data being anonymized and used for service improvement.'),
  now()
)
ON CONFLICT (document_type, version) DO NOTHING;
