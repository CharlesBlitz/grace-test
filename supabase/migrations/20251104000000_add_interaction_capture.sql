/*
  # Add Care Interaction Capture System

  ## Overview
  Foundation for the care documentation feature. Captures all meaningful interactions
  between residents and the Grace Companion system (voice conversations, reminders,
  wellness checks) for future AI documentation generation.

  ## New Tables Created

  1. **care_interaction_logs**
     - Stores every captured interaction with residents
     - Includes conversation transcripts, source type, timestamps
     - Foundation for AI documentation generation
     - Links to residents and organizations

  2. **care_documentation**
     - Stores AI-generated documentation from interactions
     - Supports multiple document types (daily notes, incidents, wellness summaries)
     - Includes review and approval workflow
     - CQC compliance fields

  3. **documentation_templates**
     - Customizable templates for different documentation types
     - Organization-specific customization
     - AI prompt configuration per template

  4. **documentation_export_log**
     - Audit trail for all documentation exports
     - Tracks integration with external systems
     - Error logging for failed exports

  ## Security
  - All tables have RLS enabled
  - Staff can only access interactions for their organization
  - Residents and families can view their own documentation
  - Audit trail is read-only for compliance

  ## Important Notes
  - Interactions are captured automatically from existing features
  - AI documentation generation happens in separate edge functions
  - Export integrations are extensible for different care systems
  - Data retention follows GDPR requirements from existing schema
*/

-- Create care_interaction_logs table
CREATE TABLE IF NOT EXISTS care_interaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who & Where
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Interaction Details
  interaction_type text NOT NULL CHECK (
    interaction_type IN (
      'conversation',
      'reminder_response',
      'wellness_check',
      'medication_admin',
      'incident',
      'activity',
      'manual_entry'
    )
  ),
  interaction_source text NOT NULL CHECK (
    interaction_source IN (
      'voice_chat',
      'reminder_system',
      'manual_entry',
      'wellness_check',
      'family_message'
    )
  ),

  -- Content (Raw Data)
  raw_transcript text,
  audio_recording_url text,
  sentiment_score numeric CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  detected_concerns text[] DEFAULT '{}',

  -- Context
  location text,
  duration_seconds integer CHECK (duration_seconds >= 0),

  -- Timestamps
  interaction_start timestamptz NOT NULL DEFAULT now(),
  interaction_end timestamptz,
  created_at timestamptz DEFAULT now(),

  -- Processing Status
  processed boolean DEFAULT false,
  documentation_generated boolean DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Indexes for performance
  CONSTRAINT interaction_end_after_start CHECK (
    interaction_end IS NULL OR interaction_end >= interaction_start
  )
);

-- Create care_documentation table
CREATE TABLE IF NOT EXISTS care_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  interaction_log_id uuid REFERENCES care_interaction_logs(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Document Type
  document_type text NOT NULL CHECK (
    document_type IN (
      'daily_note',
      'incident_report',
      'wellness_summary',
      'medication_note',
      'assessment_update',
      'handover_note',
      'family_communication'
    )
  ),
  document_title text NOT NULL,

  -- Content (AI-Generated)
  ai_generated_content text NOT NULL,
  summary text NOT NULL,
  key_observations text[] DEFAULT '{}',
  actions_taken text[] DEFAULT '{}',
  follow_up_required text[] DEFAULT '{}',

  -- CQC Compliance Fields
  cqc_domain text CHECK (
    cqc_domain IN ('safe', 'effective', 'caring', 'responsive', 'well_led', 'not_applicable')
  ),
  quality_statement_tags text[] DEFAULT '{}',

  -- Risk & Concerns
  risk_level text DEFAULT 'none' CHECK (
    risk_level IN ('none', 'low', 'medium', 'high', 'critical')
  ),
  concerns_flagged text[] DEFAULT '{}',

  -- Review & Approval
  status text DEFAULT 'draft' CHECK (
    status IN ('draft', 'reviewed', 'approved', 'archived')
  ),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,

  -- Signatures (Electronic)
  staff_signature_id uuid REFERENCES signatures(id) ON DELETE SET NULL,

  -- Versioning
  version integer DEFAULT 1 CHECK (version > 0),
  previous_version_id uuid REFERENCES care_documentation(id) ON DELETE SET NULL,

  -- Timestamps
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Export
  exported_to_ehr boolean DEFAULT false,
  export_format text,
  exported_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create documentation_templates table
CREATE TABLE IF NOT EXISTS documentation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template Details
  template_name text NOT NULL,
  document_type text NOT NULL CHECK (
    document_type IN (
      'daily_note',
      'incident_report',
      'wellness_summary',
      'medication_note',
      'assessment_update',
      'handover_note',
      'family_communication'
    )
  ),
  description text,

  -- Structure
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_fields text[] DEFAULT '{}',
  optional_fields text[] DEFAULT '{}',

  -- AI Prompt Configuration
  ai_prompt_template text,
  tone text DEFAULT 'professional' CHECK (
    tone IN ('professional', 'compassionate', 'clinical', 'informal')
  ),

  -- Settings
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,

  -- Compliance
  cqc_aligned boolean DEFAULT true,
  industry_standard text DEFAULT 'CQC',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure only one default template per document type per organization
  UNIQUE NULLS NOT DISTINCT (organization_id, document_type, is_default)
    WHERE is_default = true
);

-- Create documentation_export_log table
CREATE TABLE IF NOT EXISTS documentation_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id uuid NOT NULL REFERENCES care_documentation(id) ON DELETE CASCADE,

  -- Export Details
  export_destination text NOT NULL CHECK (
    export_destination IN (
      'person_centred_software',
      'care_control',
      'qcs',
      'pdf',
      'csv',
      'email',
      'mosaic',
      'liquid_logic',
      'systmone',
      'emis'
    )
  ),
  export_format text NOT NULL,
  export_status text DEFAULT 'pending' CHECK (
    export_status IN ('pending', 'success', 'failed', 'retrying')
  ),

  -- Recipient
  exported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  export_metadata jsonb DEFAULT '{}'::jsonb,

  -- Error Handling
  error_message text,
  retry_count integer DEFAULT 0 CHECK (retry_count >= 0),

  -- Timestamps
  exported_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE care_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_export_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for care_interaction_logs

-- Staff can view interactions for residents in their organization
CREATE POLICY "Staff can view organization interactions"
  ON care_interaction_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Residents can view their own interactions
CREATE POLICY "Residents can view own interactions"
  ON care_interaction_logs FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid());

-- NOKs can view interactions for their residents
CREATE POLICY "NOKs can view resident interactions"
  ON care_interaction_logs FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- System can insert interaction logs
CREATE POLICY "System can insert interaction logs"
  ON care_interaction_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Staff can update interactions they're involved with
CREATE POLICY "Staff can update organization interactions"
  ON care_interaction_logs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for care_documentation

-- Staff can view documentation for their organization
CREATE POLICY "Staff can view organization documentation"
  ON care_documentation FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Residents can view their own documentation
CREATE POLICY "Residents can view own documentation"
  ON care_documentation FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid());

-- NOKs can view documentation for their residents
CREATE POLICY "NOKs can view resident documentation"
  ON care_documentation FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- Staff can create documentation for their organization
CREATE POLICY "Staff can create organization documentation"
  ON care_documentation FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Staff can update documentation for their organization
CREATE POLICY "Staff can update organization documentation"
  ON care_documentation FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for documentation_templates

-- Staff can view templates for their organization
CREATE POLICY "Staff can view organization templates"
  ON documentation_templates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR organization_id IS NULL -- Global templates
  );

-- Organization admins can manage templates
CREATE POLICY "Admins can manage organization templates"
  ON documentation_templates FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND role IN ('organization_admin', 'facility_director')
        AND is_active = true
    )
  );

-- RLS Policies for documentation_export_log

-- Staff can view export logs for their organization
CREATE POLICY "Staff can view organization export logs"
  ON documentation_export_log FOR SELECT
  TO authenticated
  USING (
    documentation_id IN (
      SELECT id
      FROM care_documentation
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Staff can create export logs
CREATE POLICY "Staff can create export logs"
  ON documentation_export_log FOR INSERT
  TO authenticated
  WITH CHECK (
    documentation_id IN (
      SELECT id
      FROM care_documentation
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interaction_logs_resident
  ON care_interaction_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_organization
  ON care_interaction_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_start_time
  ON care_interaction_logs(interaction_start DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_processed
  ON care_interaction_logs(processed) WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_documentation_resident
  ON care_documentation(resident_id);
CREATE INDEX IF NOT EXISTS idx_documentation_organization
  ON care_documentation(organization_id);
CREATE INDEX IF NOT EXISTS idx_documentation_date
  ON care_documentation(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_documentation_status
  ON care_documentation(status);
CREATE INDEX IF NOT EXISTS idx_documentation_risk
  ON care_documentation(risk_level) WHERE risk_level IN ('high', 'critical');

CREATE INDEX IF NOT EXISTS idx_export_log_documentation
  ON documentation_export_log(documentation_id);
CREATE INDEX IF NOT EXISTS idx_export_log_status
  ON documentation_export_log(export_status) WHERE export_status = 'failed';

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_care_documentation_updated_at ON care_documentation;
CREATE TRIGGER update_care_documentation_updated_at
  BEFORE UPDATE ON care_documentation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documentation_templates_updated_at ON documentation_templates;
CREATE TRIGGER update_documentation_templates_updated_at
  BEFORE UPDATE ON documentation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default documentation templates
INSERT INTO documentation_templates (
  organization_id,
  template_name,
  document_type,
  description,
  sections,
  is_default,
  is_active,
  ai_prompt_template
) VALUES
  (
    NULL, -- Global template
    'Standard Daily Care Note',
    'daily_note',
    'Standard daily care note template for routine resident interactions',
    '[
      {"title": "Resident Information", "type": "header"},
      {"title": "Date and Time", "type": "datetime"},
      {"title": "Observations", "type": "ai_generated", "prompt": "Summarize physical and mental state observed during interaction"},
      {"title": "Activities", "type": "ai_generated", "prompt": "List activities resident participated in or discussed"},
      {"title": "Concerns", "type": "ai_generated", "condition": "if_concerns_detected", "prompt": "Detail any concerns identified with supporting evidence"},
      {"title": "Actions Taken", "type": "ai_generated", "prompt": "Describe any care provided or interventions performed"},
      {"title": "Follow-up Required", "type": "ai_generated", "prompt": "List any follow-up actions needed"}
    ]'::jsonb,
    true,
    true,
    'Generate a professional, person-centred daily care note based on this interaction. Use clear language, focus on the resident''s wellbeing, and highlight any observations that support quality care delivery.'
  ),
  (
    NULL,
    'Standard Incident Report',
    'incident_report',
    'Standard template for documenting incidents requiring formal reporting',
    '[
      {"title": "Incident Details", "type": "header"},
      {"title": "Date and Time", "type": "datetime"},
      {"title": "Incident Type", "type": "classification"},
      {"title": "Description", "type": "ai_generated", "prompt": "Provide clear, factual description of what occurred"},
      {"title": "Immediate Actions", "type": "ai_generated", "prompt": "Detail all immediate responses and interventions"},
      {"title": "Injuries or Harm", "type": "ai_generated", "prompt": "Document any injuries, harm, or distress"},
      {"title": "Witnesses", "type": "ai_generated", "prompt": "List any witnesses present"},
      {"title": "Notifications", "type": "ai_generated", "prompt": "Document who was notified (family, GP, manager)"},
      {"title": "Follow-up Actions", "type": "ai_generated", "prompt": "List all required follow-up actions"}
    ]'::jsonb,
    true,
    true,
    'Generate a comprehensive incident report that is factual, clear, and suitable for CQC inspection. Focus on what happened, actions taken, and follow-up required.'
  );
