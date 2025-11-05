/*
  # Documentation Enhancement System - Stage 6

  ## Overview
  Adds advanced documentation features to compete directly with Magic Notes,
  including quality metrics, time savings tracking, documentation templates,
  and performance analytics.

  ## New Tables

  ### 1. documentation_quality_metrics
  Tracks quality scores and metrics for each piece of documentation to demonstrate
  value and compliance.

  ### 2. documentation_templates
  Pre-built CQC-compliant templates for common documentation scenarios.

  ### 3. staff_time_savings
  Tracks time saved vs manual documentation to demonstrate ROI.

  ### 4. documentation_edits
  Version history and edit tracking for audit trail and quality improvement.

  ### 5. batch_processing_jobs
  Manages batch generation of multiple resident notes simultaneously.

  ### 6. audio_recording_metadata
  Stores voice recording quality metrics and speaker identification data.

  ## Key Features
  - Quality scoring for documentation (completeness, compliance, clarity)
  - Time savings calculation and ROI tracking
  - Pre-built templates for common scenarios
  - Batch processing for end-of-shift documentation
  - Audio quality metrics and speaker detection
  - AI suggestion tracking and acceptance rates
*/

-- Documentation Quality Metrics
CREATE TABLE IF NOT EXISTS documentation_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id uuid REFERENCES care_documentation(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Quality Scores (0-100)
  completeness_score integer DEFAULT 0,
  compliance_score integer DEFAULT 0,
  clarity_score integer DEFAULT 0,
  timeliness_score integer DEFAULT 0,
  overall_quality_score integer DEFAULT 0,

  -- Completeness Checks
  has_observations boolean DEFAULT false,
  has_actions_taken boolean DEFAULT false,
  has_follow_up boolean DEFAULT false,
  has_risk_assessment boolean DEFAULT false,
  word_count integer DEFAULT 0,

  -- Compliance Checks
  uses_person_centred_language boolean DEFAULT false,
  includes_resident_voice boolean DEFAULT false,
  factual_and_objective boolean DEFAULT false,
  includes_time_stamps boolean DEFAULT false,

  -- Time Tracking
  time_to_generate_seconds integer,
  time_to_review_seconds integer,
  estimated_manual_time_seconds integer DEFAULT 1800, -- 30 min default
  time_saved_seconds integer,

  -- AI Metrics
  ai_model text,
  tokens_used integer,
  ai_confidence_score numeric(3, 2),
  suggestions_made integer DEFAULT 0,
  suggestions_accepted integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documentation Templates
CREATE TABLE IF NOT EXISTS documentation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL, -- 'daily_note', 'incident_report', 'assessment', 'care_plan_review', 'family_meeting'
  description text,

  -- Template Structure
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  required_fields jsonb DEFAULT '[]'::jsonb,
  optional_fields jsonb DEFAULT '[]'::jsonb,

  -- Quality Standards
  min_word_count integer DEFAULT 100,
  required_sections jsonb DEFAULT '["observations", "actions", "follow_up"]'::jsonb,
  compliance_keywords jsonb DEFAULT '[]'::jsonb,

  -- Usage Tracking
  usage_count integer DEFAULT 0,
  average_quality_score numeric(4, 2),
  average_time_saved_seconds integer,

  -- Metadata
  is_active boolean DEFAULT true,
  is_cqc_compliant boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(template_name)
);

-- Staff Time Savings Tracking
CREATE TABLE IF NOT EXISTS staff_time_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Time Period
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Activity Counts
  documents_generated integer DEFAULT 0,
  documents_reviewed integer DEFAULT 0,
  incidents_processed integer DEFAULT 0,

  -- Time Metrics (in seconds)
  total_generation_time integer DEFAULT 0,
  total_review_time integer DEFAULT 0,
  estimated_manual_time integer DEFAULT 0,
  total_time_saved integer DEFAULT 0,

  -- Efficiency Metrics
  average_doc_generation_time integer,
  average_review_time integer,
  time_saved_percentage numeric(5, 2),

  -- Quality Metrics
  average_quality_score numeric(4, 2),
  documents_requiring_revision integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, staff_id, period_start, period_end)
);

-- Documentation Edit History
CREATE TABLE IF NOT EXISTS documentation_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id uuid REFERENCES care_documentation(id) ON DELETE CASCADE NOT NULL,
  edited_by uuid REFERENCES auth.users(id) NOT NULL,

  -- Edit Details
  edit_type text NOT NULL, -- 'ai_suggestion_accepted', 'manual_edit', 'correction', 'approval', 'rejection'
  section_edited text, -- 'observations', 'actions', 'follow_up', 'full_document'

  -- Content Changes
  previous_content text,
  new_content text,
  change_summary text,

  -- AI Suggestions
  was_ai_suggestion boolean DEFAULT false,
  ai_suggestion_confidence numeric(3, 2),

  -- Metadata
  edit_timestamp timestamptz DEFAULT now(),
  time_spent_seconds integer
);

-- Batch Processing Jobs
CREATE TABLE IF NOT EXISTS batch_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,

  -- Job Configuration
  job_type text NOT NULL, -- 'daily_notes', 'weekly_summaries', 'incident_reports', 'care_plan_updates'
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  resident_ids uuid[] NOT NULL,
  template_id uuid REFERENCES documentation_templates(id),

  -- Job Status
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
  total_items integer DEFAULT 0,
  processed_items integer DEFAULT 0,
  failed_items integer DEFAULT 0,

  -- Results
  generated_document_ids uuid[],
  error_messages jsonb DEFAULT '[]'::jsonb,

  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  total_processing_time_seconds integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audio Recording Metadata
CREATE TABLE IF NOT EXISTS audio_recording_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES care_interaction_logs(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Audio Quality
  audio_quality_score numeric(3, 2), -- 0.00 to 1.00
  background_noise_level text, -- 'low', 'medium', 'high'
  speech_clarity_score numeric(3, 2),

  -- Speaker Detection
  speakers_detected integer DEFAULT 1,
  speaker_segments jsonb DEFAULT '[]'::jsonb, -- [{"speaker": "resident", "start": 0, "end": 10, "text": "..."}]
  primary_speaker text, -- 'resident', 'staff', 'family', 'multiple'

  -- Recording Details
  recording_duration_seconds integer,
  file_size_bytes bigint,
  audio_format text,
  sample_rate integer,

  -- Transcription Quality
  transcription_confidence numeric(3, 2),
  words_transcribed integer,
  corrections_needed integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_quality_metrics_documentation ON documentation_quality_metrics(documentation_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_org ON documentation_quality_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_created ON documentation_quality_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_templates_type ON documentation_templates(template_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_usage ON documentation_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_time_savings_org_period ON staff_time_savings(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_time_savings_staff ON staff_time_savings(staff_id, period_start);

CREATE INDEX IF NOT EXISTS idx_edits_documentation ON documentation_edits(documentation_id, edit_timestamp);
CREATE INDEX IF NOT EXISTS idx_edits_user ON documentation_edits(edited_by);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_org_status ON batch_processing_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created ON batch_processing_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_audio_metadata_interaction ON audio_recording_metadata(interaction_id);
CREATE INDEX IF NOT EXISTS idx_audio_metadata_org ON audio_recording_metadata(organization_id);

-- Row Level Security

ALTER TABLE documentation_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recording_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Documentation Quality Metrics

CREATE POLICY "Staff can view quality metrics for their organization"
  ON documentation_quality_metrics FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create quality metrics"
  ON documentation_quality_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can update quality metrics"
  ON documentation_quality_metrics FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies: Documentation Templates

CREATE POLICY "Everyone can view active templates"
  ON documentation_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "System can track template usage"
  ON documentation_templates FOR UPDATE
  TO authenticated
  USING (is_active = true);

-- RLS Policies: Staff Time Savings

CREATE POLICY "Staff can view their own time savings"
  ON staff_time_savings FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Managers can view organization time savings"
  ON staff_time_savings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'manager')
    )
  );

CREATE POLICY "System can track time savings"
  ON staff_time_savings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can update time savings"
  ON staff_time_savings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies: Documentation Edits

CREATE POLICY "Staff can view edits for their organization docs"
  ON documentation_edits FOR SELECT
  TO authenticated
  USING (
    documentation_id IN (
      SELECT id FROM care_documentation
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can create edit records"
  ON documentation_edits FOR INSERT
  TO authenticated
  WITH CHECK (edited_by = auth.uid());

-- RLS Policies: Batch Processing Jobs

CREATE POLICY "Staff can view their organization batch jobs"
  ON batch_processing_jobs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create batch jobs"
  ON batch_processing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Staff can update their batch jobs"
  ON batch_processing_jobs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies: Audio Recording Metadata

CREATE POLICY "Staff can view audio metadata for their organization"
  ON audio_recording_metadata FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create audio metadata"
  ON audio_recording_metadata FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Functions

-- Calculate quality score for documentation
CREATE OR REPLACE FUNCTION calculate_documentation_quality_score(
  p_documentation_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completeness integer := 0;
  v_compliance integer := 0;
  v_clarity integer := 0;
  v_timeliness integer := 0;
  v_overall integer := 0;
  v_doc record;
BEGIN
  SELECT * INTO v_doc FROM care_documentation WHERE id = p_documentation_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Completeness Score (0-100)
  v_completeness := 0;
  IF v_doc.key_observations IS NOT NULL AND array_length(v_doc.key_observations, 1) > 0 THEN
    v_completeness := v_completeness + 25;
  END IF;
  IF v_doc.actions_taken IS NOT NULL AND array_length(v_doc.actions_taken, 1) > 0 THEN
    v_completeness := v_completeness + 25;
  END IF;
  IF v_doc.follow_up_required IS NOT NULL THEN
    v_completeness := v_completeness + 25;
  END IF;
  IF v_doc.risk_level IS NOT NULL AND v_doc.risk_level != '' THEN
    v_completeness := v_completeness + 25;
  END IF;

  -- Compliance Score (0-100)
  v_compliance := 75; -- Base score for using template
  IF v_doc.concerns_flagged IS NOT NULL AND array_length(v_doc.concerns_flagged, 1) > 0 THEN
    v_compliance := v_compliance + 10;
  END IF;
  IF length(v_doc.ai_generated_content) > 200 THEN
    v_compliance := v_compliance + 15;
  END IF;

  -- Clarity Score (based on word count and structure)
  v_clarity := LEAST(100, (length(v_doc.ai_generated_content) / 10));

  -- Timeliness Score (created same day as interactions)
  v_timeliness := 100; -- Assume timely for now

  -- Overall Score (weighted average)
  v_overall := (v_completeness * 0.35 + v_compliance * 0.35 + v_clarity * 0.20 + v_timeliness * 0.10)::integer;

  -- Update or insert quality metrics
  INSERT INTO documentation_quality_metrics (
    documentation_id,
    organization_id,
    completeness_score,
    compliance_score,
    clarity_score,
    timeliness_score,
    overall_quality_score,
    has_observations,
    has_actions_taken,
    has_follow_up,
    has_risk_assessment,
    word_count
  ) VALUES (
    p_documentation_id,
    v_doc.organization_id,
    v_completeness,
    v_compliance,
    v_clarity,
    v_timeliness,
    v_overall,
    v_doc.key_observations IS NOT NULL AND array_length(v_doc.key_observations, 1) > 0,
    v_doc.actions_taken IS NOT NULL AND array_length(v_doc.actions_taken, 1) > 0,
    v_doc.follow_up_required IS NOT NULL,
    v_doc.risk_level IS NOT NULL,
    length(v_doc.ai_generated_content)
  )
  ON CONFLICT (documentation_id)
  DO UPDATE SET
    completeness_score = v_completeness,
    compliance_score = v_compliance,
    clarity_score = v_clarity,
    timeliness_score = v_timeliness,
    overall_quality_score = v_overall,
    updated_at = now();

  RETURN v_overall;
END;
$$;

-- Track time savings for staff member
CREATE OR REPLACE FUNCTION calculate_staff_time_savings(
  p_organization_id uuid,
  p_staff_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_docs_count integer;
  v_total_gen_time integer;
  v_total_review_time integer;
  v_est_manual_time integer;
  v_time_saved integer;
  v_avg_quality numeric;
BEGIN
  -- Count documents and sum times
  SELECT
    COUNT(cd.id),
    COALESCE(SUM(dqm.time_to_generate_seconds), 0),
    COALESCE(SUM(dqm.time_to_review_seconds), 0),
    COALESCE(SUM(dqm.estimated_manual_time_seconds), COUNT(cd.id) * 1800),
    COALESCE(AVG(dqm.overall_quality_score), 0)
  INTO
    v_docs_count,
    v_total_gen_time,
    v_total_review_time,
    v_est_manual_time,
    v_avg_quality
  FROM care_documentation cd
  LEFT JOIN documentation_quality_metrics dqm ON dqm.documentation_id = cd.id
  WHERE cd.organization_id = p_organization_id
    AND cd.staff_id = p_staff_id
    AND cd.document_date BETWEEN p_period_start AND p_period_end;

  v_time_saved := v_est_manual_time - (v_total_gen_time + v_total_review_time);

  -- Insert or update time savings record
  INSERT INTO staff_time_savings (
    organization_id,
    staff_id,
    period_start,
    period_end,
    documents_generated,
    total_generation_time,
    total_review_time,
    estimated_manual_time,
    total_time_saved,
    average_doc_generation_time,
    average_review_time,
    time_saved_percentage,
    average_quality_score
  ) VALUES (
    p_organization_id,
    p_staff_id,
    p_period_start,
    p_period_end,
    v_docs_count,
    v_total_gen_time,
    v_total_review_time,
    v_est_manual_time,
    v_time_saved,
    CASE WHEN v_docs_count > 0 THEN v_total_gen_time / v_docs_count ELSE 0 END,
    CASE WHEN v_docs_count > 0 THEN v_total_review_time / v_docs_count ELSE 0 END,
    CASE WHEN v_est_manual_time > 0 THEN (v_time_saved::numeric / v_est_manual_time::numeric * 100) ELSE 0 END,
    v_avg_quality
  )
  ON CONFLICT (organization_id, staff_id, period_start, period_end)
  DO UPDATE SET
    documents_generated = v_docs_count,
    total_generation_time = v_total_gen_time,
    total_review_time = v_total_review_time,
    estimated_manual_time = v_est_manual_time,
    total_time_saved = v_time_saved,
    average_doc_generation_time = CASE WHEN v_docs_count > 0 THEN v_total_gen_time / v_docs_count ELSE 0 END,
    average_review_time = CASE WHEN v_docs_count > 0 THEN v_total_review_time / v_docs_count ELSE 0 END,
    time_saved_percentage = CASE WHEN v_est_manual_time > 0 THEN (v_time_saved::numeric / v_est_manual_time::numeric * 100) ELSE 0 END,
    average_quality_score = v_avg_quality,
    updated_at = now();
END;
$$;

-- Insert default templates
INSERT INTO documentation_templates (template_name, template_type, description, system_prompt, user_prompt_template, required_sections)
VALUES
(
  'Standard Daily Care Note',
  'daily_note',
  'CQC-compliant daily care note template for routine observations and activities',
  'You are a professional care documentation assistant. Generate clear, person-centred daily care notes that meet CQC standards. Use factual, objective language and focus on the resident''s wellbeing.',
  'Generate a daily care note for {resident_name} based on today''s interactions:\n\n{interaction_summaries}\n\nInclude sections: General Observations, Activities and Engagement, Concerns (if any), Actions Taken, Follow-up Required.',
  '["observations", "activities", "actions", "follow_up"]'::jsonb
),
(
  'Incident Report',
  'incident_report',
  'Comprehensive incident report template for accidents, injuries, and safeguarding concerns',
  'You are a professional incident report writer. Generate factual, detailed incident reports suitable for CQC inspection. Include all required information and maintain objectivity.',
  'Generate an incident report for {resident_name} based on the following incident:\n\n{incident_details}\n\nInclude: Incident Summary, Detailed Description, Immediate Actions, Injuries/Harm, Witnesses, Notifications, Risk Assessment, Follow-up Actions.',
  '["summary", "description", "actions", "risk_assessment"]'::jsonb
),
(
  'Weekly Wellness Summary',
  'weekly_summary',
  'Comprehensive weekly summary of resident wellbeing, activities, and changes',
  'You are a care manager creating weekly wellness summaries. Analyze the week''s interactions and create a comprehensive summary highlighting patterns, changes, and overall wellbeing.',
  'Generate a weekly wellness summary for {resident_name} covering {date_range}:\n\n{weekly_interactions}\n\nInclude: Overall Wellbeing, Activity Highlights, Social Engagement, Physical Health, Emotional State, Concerns/Changes, Recommendations.',
  '["wellbeing", "activities", "health", "concerns"]'::jsonb
),
(
  'Family Meeting Notes',
  'family_meeting',
  'Professional notes from family meetings and care plan discussions',
  'You are documenting a family meeting. Create clear, professional notes that capture discussions, decisions, and action points while maintaining a supportive tone.',
  'Document the family meeting for {resident_name}:\n\nAttendees: {attendees}\nDiscussion Topics: {topics}\n\nCreate meeting notes including: Discussion Summary, Family Concerns, Care Plan Updates, Decisions Made, Action Points, Next Review Date.',
  '["discussion", "decisions", "actions"]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- Triggers

CREATE OR REPLACE FUNCTION update_documentation_quality_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM calculate_documentation_quality_score(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_quality_on_documentation_create
  AFTER INSERT ON care_documentation
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_quality_on_create();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quality_metrics_timestamp
  BEFORE UPDATE ON documentation_quality_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_savings_timestamp
  BEFORE UPDATE ON staff_time_savings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_jobs_timestamp
  BEFORE UPDATE ON batch_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON documentation_quality_metrics TO authenticated;
GRANT ALL ON documentation_templates TO authenticated;
GRANT ALL ON staff_time_savings TO authenticated;
GRANT ALL ON documentation_edits TO authenticated;
GRANT ALL ON batch_processing_jobs TO authenticated;
GRANT ALL ON audio_recording_metadata TO authenticated;
