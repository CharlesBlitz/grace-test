/*
  # Stage 7: Audit Trail & CQC Compliance System

  ## Overview
  Comprehensive audit trail and CQC (Care Quality Commission) compliance system for care facilities.
  Provides complete transparency, regulatory compliance support, and inspection readiness.

  ## New Tables Created

  1. **audit_trail**
     - Complete audit log of all documentation changes and system actions
     - Tracks who did what, when, and what changed
     - Immutable records for compliance and forensic analysis
     - Captures before/after states for all modifications

  2. **cqc_compliance_scores**
     - Tracks documentation coverage and compliance metrics over time
     - Calculates percentage coverage for each fundamental standard
     - Monitors trends and improvements in compliance
     - Generates overall organizational readiness scores

  3. **documentation_quality_scores**
     - Quality assessment scores for care documentation
     - Identifies documentation that needs improvement
     - Tracks completeness, timeliness, and adherence to standards
     - Links to specific documentation for review

  4. **cqc_inspection_reports**
     - Stores generated CQC inspection reports
     - Archives report versions for historical reference
     - Tracks which staff generated reports and when
     - Supports quick re-generation for inspections

  5. **compliance_alerts**
     - Real-time alerts for missing or overdue documentation
     - Escalation tracking for critical compliance gaps
     - Status tracking (active, acknowledged, resolved)
     - Links to specific residents or documentation types

  6. **staff_documentation_stats**
     - Tracks documentation performance by staff member
     - Calculates completion rates and timeliness metrics
     - Identifies training needs and best performers
     - Aggregates by role and time period

  7. **cqc_evidence_tags**
     - Categorizes documentation by CQC fundamental standards
     - Enables quick retrieval of evidence during inspections
     - Supports multiple tags per document
     - Links to care plans, assessments, incidents, and notes

  ## Security
  - All tables have RLS enabled
  - Audit logs are read-only for most users
  - Only organization admins can generate compliance reports
  - Staff can view their own performance statistics
  - Compliance data is restricted to authorized personnel

  ## Compliance Focus Areas
  - Safe: Safeguarding, risk assessment, infection control
  - Effective: Staff training, supervision, evidence-based care
  - Caring: Privacy, dignity, emotional support
  - Responsive: Person-centered care, complaints handling
  - Well-led: Governance, auditing, continuous improvement
*/

-- Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'export', 'access_denied',
    'documentation_created', 'documentation_updated', 'documentation_approved',
    'care_plan_created', 'care_plan_updated', 'care_plan_reviewed',
    'assessment_completed', 'incident_reported', 'incident_resolved',
    'medication_administered', 'signature_captured', 'permission_changed'
  )),
  resource_type text NOT NULL CHECK (resource_type IN (
    'care_documentation', 'care_plan', 'assessment', 'incident_report',
    'medication_log', 'user_account', 'organization_settings', 'care_team',
    'shift_schedule', 'audit_log', 'export', 'integration', 'signature'
  )),
  resource_id uuid,
  resident_id uuid REFERENCES users(id) ON DELETE SET NULL,
  before_state jsonb DEFAULT '{}',
  after_state jsonb DEFAULT '{}',
  changes_summary text,
  ip_address inet,
  user_agent text,
  session_id text,
  was_successful boolean DEFAULT true,
  failure_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT audit_trail_resource_required CHECK (resource_id IS NOT NULL OR action_type IN ('login', 'logout', 'access_denied'))
);

-- CQC Compliance Scores Table
CREATE TABLE IF NOT EXISTS cqc_compliance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  overall_score decimal(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- CQC Fundamental Standards Coverage
  safe_score decimal(5,2) DEFAULT 0 CHECK (safe_score >= 0 AND safe_score <= 100),
  effective_score decimal(5,2) DEFAULT 0 CHECK (effective_score >= 0 AND effective_score <= 100),
  caring_score decimal(5,2) DEFAULT 0 CHECK (caring_score >= 0 AND caring_score <= 100),
  responsive_score decimal(5,2) DEFAULT 0 CHECK (responsive_score >= 0 AND responsive_score <= 100),
  well_led_score decimal(5,2) DEFAULT 0 CHECK (well_led_score >= 0 AND well_led_score <= 100),

  -- Documentation Coverage Metrics
  daily_notes_coverage decimal(5,2) DEFAULT 0,
  care_plan_coverage decimal(5,2) DEFAULT 0,
  assessment_coverage decimal(5,2) DEFAULT 0,
  incident_documentation decimal(5,2) DEFAULT 0,
  medication_records_coverage decimal(5,2) DEFAULT 0,
  risk_assessment_coverage decimal(5,2) DEFAULT 0,

  -- Compliance Indicators
  overdue_documentation_count integer DEFAULT 0,
  missing_signatures_count integer DEFAULT 0,
  incomplete_care_plans_count integer DEFAULT 0,
  outstanding_incidents_count integer DEFAULT 0,

  -- Trend Analysis
  trend_direction text CHECK (trend_direction IN ('improving', 'stable', 'declining', 'new')),
  previous_score decimal(5,2),
  score_change decimal(5,2),

  recommendations jsonb DEFAULT '[]',
  calculation_metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, calculation_date)
);

-- Documentation Quality Scores Table
CREATE TABLE IF NOT EXISTS documentation_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  documentation_type text NOT NULL CHECK (documentation_type IN (
    'daily_note', 'care_plan', 'assessment', 'incident_report',
    'medication_log', 'handover_note', 'risk_assessment'
  )),
  documentation_id uuid NOT NULL,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Quality Metrics
  overall_quality_score decimal(5,2) NOT NULL CHECK (overall_quality_score >= 0 AND overall_quality_score <= 100),
  completeness_score decimal(5,2) DEFAULT 0,
  timeliness_score decimal(5,2) DEFAULT 0,
  detail_score decimal(5,2) DEFAULT 0,
  compliance_score decimal(5,2) DEFAULT 0,

  -- Specific Issues
  missing_required_fields text[] DEFAULT '{}',
  quality_issues text[] DEFAULT '{}',
  improvement_suggestions text[] DEFAULT '{}',

  -- Flags
  requires_review boolean DEFAULT false,
  flagged_for_training boolean DEFAULT false,
  is_exemplary boolean DEFAULT false,

  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  review_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CQC Inspection Reports Table
CREATE TABLE IF NOT EXISTS cqc_inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN (
    'full_inspection', 'safe', 'effective', 'caring', 'responsive', 'well_led',
    'resident_specific', 'custom', 'pre_inspection', 'follow_up'
  )),

  -- Report Parameters
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  resident_ids jsonb DEFAULT '[]',
  included_sections jsonb DEFAULT '[]',

  -- Report Content
  report_summary text,
  findings jsonb DEFAULT '{}',
  evidence_references jsonb DEFAULT '[]',
  areas_of_strength text[] DEFAULT '{}',
  areas_for_improvement text[] DEFAULT '{}',
  action_plan jsonb DEFAULT '[]',

  -- Compliance Assessment
  overall_compliance_rating text CHECK (overall_compliance_rating IN (
    'outstanding', 'good', 'requires_improvement', 'inadequate', 'not_rated'
  )),
  compliance_score decimal(5,2),

  -- File Management
  pdf_file_url text,
  pdf_file_size_bytes bigint,
  csv_data_url text,

  -- Metadata
  generated_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  report_version integer DEFAULT 1,
  is_draft boolean DEFAULT false,
  published_at timestamptz,

  generation_duration_ms integer,
  record_count integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Compliance Alerts Table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN (
    'missing_documentation', 'overdue_review', 'incomplete_care_plan',
    'unsigned_document', 'expired_assessment', 'outstanding_incident',
    'low_compliance_score', 'quality_concern', 'regulatory_deadline'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Alert Details
  title text NOT NULL,
  description text NOT NULL,
  resident_id uuid REFERENCES users(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES users(id) ON DELETE SET NULL,
  related_documentation_type text,
  related_documentation_id uuid,

  -- Due Dates and Escalation
  due_date date,
  days_overdue integer DEFAULT 0,
  escalation_level integer DEFAULT 0,
  escalated_at timestamptz,

  -- Status Tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes text,

  -- Recommendations
  recommended_action text,
  auto_generated boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff Documentation Stats Table
CREATE TABLE IF NOT EXISTS staff_documentation_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Volume Metrics
  total_documents_created integer DEFAULT 0,
  daily_notes_created integer DEFAULT 0,
  care_plans_created integer DEFAULT 0,
  assessments_completed integer DEFAULT 0,
  incidents_reported integer DEFAULT 0,

  -- Quality Metrics
  average_quality_score decimal(5,2),
  documents_requiring_review integer DEFAULT 0,
  exemplary_documents integer DEFAULT 0,

  -- Timeliness Metrics
  on_time_completion_rate decimal(5,2),
  average_completion_delay_hours decimal(8,2),
  overdue_documents integer DEFAULT 0,

  -- Compliance Metrics
  signatures_captured integer DEFAULT 0,
  documents_with_issues integer DEFAULT 0,
  training_flags integer DEFAULT 0,

  -- Performance Indicators
  productivity_score decimal(5,2),
  compliance_score decimal(5,2),
  overall_performance_rating text CHECK (overall_performance_rating IN (
    'excellent', 'good', 'satisfactory', 'needs_improvement'
  )),

  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, staff_id, period_start, period_end)
);

-- CQC Evidence Tags Table
CREATE TABLE IF NOT EXISTS cqc_evidence_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  documentation_type text NOT NULL CHECK (documentation_type IN (
    'daily_note', 'care_plan', 'assessment', 'incident_report',
    'medication_log', 'training_record', 'policy_document', 'meeting_minutes'
  )),
  documentation_id uuid NOT NULL,

  -- CQC Fundamental Standards
  cqc_standard text NOT NULL CHECK (cqc_standard IN (
    'safe', 'effective', 'caring', 'responsive', 'well_led'
  )),
  cqc_regulation text,

  -- Specific Evidence Type
  evidence_category text CHECK (evidence_category IN (
    'safeguarding', 'risk_assessment', 'infection_control', 'medicines_management',
    'staff_training', 'supervision', 'evidence_based_care', 'nutrition_hydration',
    'privacy_dignity', 'emotional_support', 'end_of_life_care',
    'person_centered_care', 'complaints_handling', 'choice_control',
    'governance', 'quality_monitoring', 'continuous_improvement', 'leadership'
  )),

  -- Tagging Metadata
  tagged_by uuid REFERENCES users(id) ON DELETE SET NULL,
  auto_tagged boolean DEFAULT false,
  confidence_score decimal(5,2),
  relevance_notes text,

  created_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, documentation_type, documentation_id, cqc_standard, evidence_category)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_org_date ON audit_trail(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resident ON audit_trail(resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_scores_org_date ON cqc_compliance_scores(organization_id, calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_scores_overall ON cqc_compliance_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_compliance_scores_trend ON cqc_compliance_scores(trend_direction, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_quality_scores_org ON documentation_quality_scores(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_scores_doc ON documentation_quality_scores(documentation_type, documentation_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_staff ON documentation_quality_scores(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_scores_review ON documentation_quality_scores(requires_review) WHERE requires_review = true;

CREATE INDEX IF NOT EXISTS idx_inspection_reports_org ON cqc_inspection_reports(organization_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_type ON cqc_inspection_reports(report_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_draft ON cqc_inspection_reports(is_draft) WHERE is_draft = true;

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_org ON compliance_alerts(organization_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status, due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_resident ON compliance_alerts(resident_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_active ON compliance_alerts(organization_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_staff_stats_org_period ON staff_documentation_stats(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_staff_stats_staff ON staff_documentation_stats(staff_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_tags_org ON cqc_evidence_tags(organization_id, cqc_standard);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_doc ON cqc_evidence_tags(documentation_type, documentation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_category ON cqc_evidence_tags(evidence_category, cqc_standard);

-- Enable Row Level Security
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE cqc_compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cqc_inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documentation_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE cqc_evidence_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_trail
CREATE POLICY "Organization staff can view audit trail"
  ON audit_trail FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create audit trail entries"
  ON audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for cqc_compliance_scores
CREATE POLICY "Organization staff can view compliance scores"
  ON cqc_compliance_scores FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage compliance scores"
  ON cqc_compliance_scores FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
    )
  );

-- RLS Policies for documentation_quality_scores
CREATE POLICY "Organization staff can view quality scores"
  ON documentation_quality_scores FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can manage quality scores"
  ON documentation_quality_scores FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for cqc_inspection_reports
CREATE POLICY "Organization staff can view inspection reports"
  ON cqc_inspection_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can create inspection reports"
  ON cqc_inspection_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager')
    )
    AND generated_by = auth.uid()
  );

CREATE POLICY "Organization admins can update inspection reports"
  ON cqc_inspection_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
    )
  );

-- RLS Policies for compliance_alerts
CREATE POLICY "Organization staff can view compliance alerts"
  ON compliance_alerts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can manage compliance alerts"
  ON compliance_alerts FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_documentation_stats
CREATE POLICY "Staff can view own documentation stats"
  ON staff_documentation_stats FOR SELECT
  TO authenticated
  USING (
    staff_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager')
    )
  );

CREATE POLICY "Organization can manage staff documentation stats"
  ON staff_documentation_stats FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for cqc_evidence_tags
CREATE POLICY "Organization staff can view evidence tags"
  ON cqc_evidence_tags FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can manage evidence tags"
  ON cqc_evidence_tags FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documentation_quality_scores_updated_at
  BEFORE UPDATE ON documentation_quality_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cqc_inspection_reports_updated_at
  BEFORE UPDATE ON cqc_inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_alerts_updated_at
  BEFORE UPDATE ON compliance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
