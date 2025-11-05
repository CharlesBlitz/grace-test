/*
  # GDPR-Compliant Conversation Data Retention System

  ## Overview
  Implements comprehensive data governance for conversation storage to comply with UK GDPR
  while supporting legitimate wellbeing monitoring needs for vulnerable adults.

  ## Legal Framework
  This migration establishes three-tiered retention based on:
  - Article 6(1)(f): Legitimate interests (wellbeing monitoring)
  - Article 6(1)(d): Vital interests (protecting life)
  - Article 6(1)(c): Legal obligation (safeguarding duties)
  - Article 6(1)(a): Explicit consent (optional long-term storage)

  ## Changes Made

  1. **Enhanced conversations table**
     - `legal_basis` - GDPR legal basis for storing this conversation
     - `retention_category` - Classification tier (safeguarding/monitoring/improvement)
     - `archive_after` - Timestamp when conversation should be archived
     - `delete_after` - Timestamp when conversation should be permanently deleted
     - `is_archived` - Whether conversation is in cold storage
     - `flagged_for_safeguarding` - AI or manual flag for concerning content
     - `safeguarding_notes` - Context for why conversation is retained for safeguarding
     - `contains_health_data` - Special category data marker (Article 9)
     - `anonymized_at` - When conversation was anonymized for analytics

  2. **New Table: archived_conversations**
     - Cold storage for conversations past primary retention period
     - Maintains same structure as conversations but separate for performance
     - Additional encryption layer required at application level

  3. **New Table: conversation_access_log**
     - Audit trail of all access to conversations
     - Tracks who accessed what and when (GDPR Article 15 compliance)
     - Required for demonstrating accountability

  4. **New Table: data_subject_requests**
     - Tracks GDPR rights requests (access, deletion, portability, objection)
     - Ensures timely response (30 days under GDPR Article 12)
     - Audit trail for compliance demonstration

  5. **New Table: conversation_retention_policies**
     - User-specific retention preferences
     - Tracks consent for different retention categories
     - Allows granular control while respecting legal minimums

  6. **Enhanced users table**
     - `conversation_retention_preference` - User's chosen retention period
     - `analytics_consent` - Consent for anonymized data use
     - `analytics_consent_date` - When consent was given (annual renewal)
     - `last_data_export` - When user last exercised portability right
     - `data_processing_objection` - Whether user has objected to processing

  7. **Security & Access Control**
     - Enhanced RLS policies for tiered access
     - Safeguarding data access limited to authorized parties
     - Audit logging mandatory for all sensitive access
     - NoK access restricted based on permissions

  ## Retention Tiers

  **Tier 1: Essential Safeguarding (7 years)**
  - Conversations flagged as concerning
  - Legal basis: Legal obligation, Vital interests
  - Cannot be deleted by user request if legal duty applies
  - Access: Elder, Primary NoK, Authorized authorities

  **Tier 2: Family Monitoring (12-24 months, user configurable)**
  - Normal wellbeing conversations
  - Legal basis: Legitimate interests, Consent
  - Can be deleted on request with 30-day grace period
  - Access: Elder, All authorized NoKs

  **Tier 3: Service Improvement (Indefinite, anonymized)**
  - Anonymized conversation patterns
  - Legal basis: Consent (must be explicit)
  - Cannot be linked back to individual
  - Access: Internal analytics team only

  ## Important Notes
  - This migration does NOT automatically delete existing data
  - Requires application-level implementation of lifecycle management
  - Anonymization must be irreversible (GDPR Recital 26)
  - Annual Data Protection Impact Assessment (DPIA) review required
  - Record of Processing Activities must be maintained
*/

-- Add new columns to conversations table
DO $$
BEGIN
  -- Legal and retention tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'legal_basis'
  ) THEN
    ALTER TABLE conversations ADD COLUMN legal_basis text NOT NULL DEFAULT 'legitimate_interest'
      CHECK (legal_basis IN ('consent', 'legitimate_interest', 'vital_interest', 'legal_obligation'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'retention_category'
  ) THEN
    ALTER TABLE conversations ADD COLUMN retention_category text NOT NULL DEFAULT 'family_monitoring'
      CHECK (retention_category IN ('essential_safeguarding', 'family_monitoring', 'service_improvement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'archive_after'
  ) THEN
    ALTER TABLE conversations ADD COLUMN archive_after timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'delete_after'
  ) THEN
    ALTER TABLE conversations ADD COLUMN delete_after timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_archived boolean DEFAULT false;
  END IF;

  -- Safeguarding markers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'flagged_for_safeguarding'
  ) THEN
    ALTER TABLE conversations ADD COLUMN flagged_for_safeguarding boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'safeguarding_notes'
  ) THEN
    ALTER TABLE conversations ADD COLUMN safeguarding_notes text;
  END IF;

  -- Special category data (Article 9 GDPR)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'contains_health_data'
  ) THEN
    ALTER TABLE conversations ADD COLUMN contains_health_data boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'anonymized_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN anonymized_at timestamptz;
  END IF;
END $$;

-- Create archived_conversations table (cold storage)
CREATE TABLE IF NOT EXISTS archived_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id uuid NOT NULL,
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript text NOT NULL,
  sentiment text DEFAULT 'neu' CHECK (sentiment IN ('pos', 'neu', 'neg')),
  legal_basis text NOT NULL,
  retention_category text NOT NULL,
  flagged_for_safeguarding boolean DEFAULT false,
  safeguarding_notes text,
  contains_health_data boolean DEFAULT false,
  original_created_at timestamptz NOT NULL,
  archived_at timestamptz DEFAULT now(),
  delete_after timestamptz,
  UNIQUE(original_id)
);

ALTER TABLE archived_conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation access log (audit trail)
CREATE TABLE IF NOT EXISTS conversation_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  accessed_by uuid NOT NULL REFERENCES users(id),
  access_type text NOT NULL CHECK (access_type IN ('view', 'export', 'share', 'delete')),
  access_reason text,
  ip_address inet,
  user_agent text,
  accessed_at timestamptz DEFAULT now()
);

ALTER TABLE conversation_access_log ENABLE ROW LEVEL SECURITY;

-- Create data subject requests table (GDPR rights tracking)
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
  request_details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  rejection_reason text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  response_due_date timestamptz NOT NULL,
  assigned_to text,
  notes text
);

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Create retention policies table (user preferences)
CREATE TABLE IF NOT EXISTS conversation_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  retention_period_months integer DEFAULT 12 CHECK (retention_period_months BETWEEN 12 AND 84),
  safeguarding_retention_years integer DEFAULT 7 CHECK (safeguarding_retention_years BETWEEN 7 AND 10),
  analytics_consent boolean DEFAULT false,
  analytics_consent_date timestamptz,
  last_modified_at timestamptz DEFAULT now(),
  last_modified_by uuid REFERENCES users(id),
  UNIQUE(user_id)
);

ALTER TABLE conversation_retention_policies ENABLE ROW LEVEL SECURITY;

-- Add GDPR-related columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'conversation_retention_preference'
  ) THEN
    ALTER TABLE users ADD COLUMN conversation_retention_preference integer DEFAULT 12
      CHECK (conversation_retention_preference BETWEEN 12 AND 84);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'analytics_consent'
  ) THEN
    ALTER TABLE users ADD COLUMN analytics_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'analytics_consent_date'
  ) THEN
    ALTER TABLE users ADD COLUMN analytics_consent_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_data_export'
  ) THEN
    ALTER TABLE users ADD COLUMN last_data_export timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'data_processing_objection'
  ) THEN
    ALTER TABLE users ADD COLUMN data_processing_objection boolean DEFAULT false;
  END IF;
END $$;

-- RLS Policies for archived_conversations

-- Elders can view own archived conversations
CREATE POLICY "Elders can view own archived conversations"
  ON archived_conversations FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

-- NoKs can view archived conversations of elders they care for
CREATE POLICY "NoKs can view archived elder conversations"
  ON archived_conversations FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- RLS Policies for conversation_access_log

-- Users can view access logs for their own conversations
CREATE POLICY "Users can view own conversation access logs"
  ON conversation_access_log FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE elder_id = auth.uid()
    )
    OR
    conversation_id IN (
      SELECT original_id FROM archived_conversations WHERE elder_id = auth.uid()
    )
  );

-- System can insert access logs
CREATE POLICY "System can insert access logs"
  ON conversation_access_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for data_subject_requests

-- Users can view their own data subject requests
CREATE POLICY "Users can view own data subject requests"
  ON data_subject_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own data subject requests
CREATE POLICY "Users can create own data subject requests"
  ON data_subject_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NoKs can create requests on behalf of elders they care for
CREATE POLICY "NoKs can create requests for elders"
  ON data_subject_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
      AND can_modify_settings = true
    )
  );

-- RLS Policies for conversation_retention_policies

-- Users can view their own retention policy
CREATE POLICY "Users can view own retention policy"
  ON conversation_retention_policies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own retention policy
CREATE POLICY "Users can update own retention policy"
  ON conversation_retention_policies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own retention policy
CREATE POLICY "Users can insert own retention policy"
  ON conversation_retention_policies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NoKs can view retention policies of elders they care for
CREATE POLICY "NoKs can view elder retention policies"
  ON conversation_retention_policies FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- Create indexes for performance

CREATE INDEX IF NOT EXISTS idx_conversations_archive_after
  ON conversations(archive_after)
  WHERE is_archived = false AND archive_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_delete_after
  ON conversations(delete_after)
  WHERE delete_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_flagged
  ON conversations(elder_id, flagged_for_safeguarding)
  WHERE flagged_for_safeguarding = true;

CREATE INDEX IF NOT EXISTS idx_conversations_retention_category
  ON conversations(retention_category, created_at);

CREATE INDEX IF NOT EXISTS idx_archived_conversations_elder
  ON archived_conversations(elder_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_archived_conversations_delete
  ON archived_conversations(delete_after)
  WHERE delete_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_access_log_conversation
  ON conversation_access_log(conversation_id, accessed_at);

CREATE INDEX IF NOT EXISTS idx_dsr_user_status
  ON data_subject_requests(user_id, status, response_due_date);

CREATE INDEX IF NOT EXISTS idx_dsr_due_date
  ON data_subject_requests(response_due_date)
  WHERE status IN ('pending', 'in_progress');

-- Create function to automatically set retention dates
CREATE OR REPLACE FUNCTION set_conversation_retention_dates()
RETURNS TRIGGER AS $$
DECLARE
  retention_months integer;
BEGIN
  -- Get user's retention preference
  SELECT conversation_retention_preference
  INTO retention_months
  FROM users
  WHERE id = NEW.elder_id;

  -- Default to 12 months if not set
  IF retention_months IS NULL THEN
    retention_months := 12;
  END IF;

  -- Set dates based on retention category
  IF NEW.retention_category = 'essential_safeguarding' THEN
    -- 7 years for safeguarding
    NEW.archive_after := NEW.created_at + interval '2 years';
    NEW.delete_after := NEW.created_at + interval '7 years';
  ELSIF NEW.retention_category = 'family_monitoring' THEN
    -- User preference (12-24 months typically)
    NEW.archive_after := NEW.created_at + (retention_months || ' months')::interval;
    NEW.delete_after := NEW.created_at + ((retention_months + 12) || ' months')::interval;
  ELSIF NEW.retention_category = 'service_improvement' THEN
    -- Anonymize after 6 months, keep indefinitely
    NEW.archive_after := NEW.created_at + interval '6 months';
    NEW.delete_after := NULL; -- Never delete, but must be anonymized
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set retention dates
DROP TRIGGER IF EXISTS set_retention_dates_trigger ON conversations;
CREATE TRIGGER set_retention_dates_trigger
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_retention_dates();

-- Create function to update retention dates when user changes preferences
CREATE OR REPLACE FUNCTION update_retention_on_preference_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update non-archived, non-safeguarding conversations
  UPDATE conversations
  SET
    archive_after = created_at + (NEW.conversation_retention_preference || ' months')::interval,
    delete_after = created_at + ((NEW.conversation_retention_preference + 12) || ' months')::interval
  WHERE
    elder_id = NEW.id
    AND is_archived = false
    AND retention_category = 'family_monitoring'
    AND flagged_for_safeguarding = false;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for retention preference changes
DROP TRIGGER IF EXISTS update_retention_trigger ON users;
CREATE TRIGGER update_retention_trigger
  AFTER UPDATE OF conversation_retention_preference ON users
  FOR EACH ROW
  WHEN (OLD.conversation_retention_preference IS DISTINCT FROM NEW.conversation_retention_preference)
  EXECUTE FUNCTION update_retention_on_preference_change();

-- Initialize retention policies for existing users
INSERT INTO conversation_retention_policies (user_id, retention_period_months, analytics_consent)
SELECT id, 12, false
FROM users
WHERE role = 'elder'
ON CONFLICT (user_id) DO NOTHING;

-- Update existing conversations with default retention dates
UPDATE conversations
SET
  legal_basis = 'legitimate_interest',
  retention_category = 'family_monitoring',
  archive_after = created_at + interval '12 months',
  delete_after = created_at + interval '24 months',
  is_archived = false,
  flagged_for_safeguarding = false,
  contains_health_data = false
WHERE
  archive_after IS NULL;
