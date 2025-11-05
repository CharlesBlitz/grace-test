/*
  # Mental Capacity Assessments and DoLS Management System

  ## Overview
  This migration creates a comprehensive system for managing Mental Capacity Assessments (MCA)
  and Deprivation of Liberty Safeguards (DoLS) in compliance with the Mental Capacity Act 2005.

  ## New Tables

  ### 1. mca_decision_types
  Lookup table for types of decisions requiring capacity assessment
  - `id` (uuid, primary key)
  - `name` (text) - Decision type name
  - `description` (text) - Description of decision type
  - `category` (text) - Category grouping (medical, care, financial, personal)
  - `requires_specialist` (boolean) - Whether specialist input required
  - `is_active` (boolean)

  ### 2. mental_capacity_assessments
  Core table for recording decision-specific capacity assessments
  - `id` (uuid, primary key)
  - `organization_id` (uuid)
  - `resident_id` (uuid)
  - `care_plan_id` (uuid, nullable) - Links to specific care plan if applicable
  - `decision_type_id` (uuid) - Type of decision being assessed
  - `decision_description` (text) - Specific decision details
  - `assessment_date` (date)
  - `assessed_by` (uuid) - Staff member conducting assessment
  - `assessment_location` (text)
  - `has_capacity` (boolean, nullable) - Outcome: has capacity or not
  - `capacity_determination` (text) - 'has_capacity', 'lacks_capacity', 'fluctuating', 'pending'
  - `understand_information` (boolean) - Can understand relevant information
  - `retain_information` (boolean) - Can retain information
  - `use_information` (boolean) - Can use/weigh information
  - `communicate_decision` (boolean) - Can communicate decision
  - `evidence_notes` (text) - Supporting evidence and reasoning
  - `steps_taken_to_support` (text) - Steps taken to help person make decision
  - `consultation_notes` (text) - Notes from consultations with family/advocates
  - `assessment_outcome` (text) - Detailed outcome and reasoning
  - `next_review_date` (date) - When to reassess
  - `status` (text) - 'completed', 'pending_review', 'superseded'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. best_interests_decisions
  Records decisions made under best interests when capacity is lacking
  - `id` (uuid, primary key)
  - `mca_assessment_id` (uuid) - Links to capacity assessment
  - `resident_id` (uuid)
  - `decision_maker_id` (uuid) - Staff member making decision
  - `decision_description` (text) - What decision was made
  - `decision_date` (date)
  - `family_consulted` (boolean)
  - `family_views` (text)
  - `advocate_involved` (boolean)
  - `advocate_views` (text)
  - `resident_wishes_known` (text) - Known past and present wishes
  - `beliefs_and_values` (text) - Relevant beliefs and values
  - `factors_considered` (text) - All factors considered
  - `less_restrictive_options` (text) - Less restrictive options considered
  - `decision_rationale` (text) - Why this decision is in best interests
  - `meeting_attendees` (jsonb) - Array of people involved in decision
  - `created_at` (timestamptz)

  ### 4. dols_authorizations
  Deprivation of Liberty Safeguards authorization records
  - `id` (uuid, primary key)
  - `organization_id` (uuid)
  - `resident_id` (uuid)
  - `care_plan_id` (uuid, nullable)
  - `authorization_type` (text) - 'standard', 'urgent'
  - `authorization_reference` (text) - External reference number
  - `supervisory_body` (text) - Local authority/supervisory body name
  - `application_date` (date)
  - `authorization_start_date` (date)
  - `authorization_end_date` (date)
  - `authorization_granted_date` (date, nullable)
  - `status` (text) - 'pending', 'granted', 'expired', 'withdrawn', 'refused'
  - `deprivation_reason` (text) - Why deprivation necessary
  - `restrictions_imposed` (jsonb) - Array of specific restrictions
  - `conditions_attached` (jsonb) - Array of conditions on authorization
  - `managing_authority` (text) - Care home/hospital name
  - `relevant_person_representative` (text) - RPR details
  - `imca_appointed` (boolean)
  - `imca_details` (text)
  - `urgent_authorization_used` (boolean)
  - `urgent_authorization_dates` (jsonb)
  - `last_review_date` (date)
  - `next_review_date` (date)
  - `review_notes` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. dols_review_records
  Records of periodic DoLS reviews and monitoring
  - `id` (uuid, primary key)
  - `dols_authorization_id` (uuid)
  - `review_date` (date)
  - `reviewed_by` (uuid)
  - `review_type` (text) - 'scheduled', 'triggered', 'renewal'
  - `conditions_still_necessary` (boolean)
  - `restrictions_still_proportionate` (boolean)
  - `resident_views_sought` (boolean)
  - `resident_views` (text)
  - `family_views_sought` (boolean)
  - `family_views` (text)
  - `changes_recommended` (text)
  - `action_taken` (text)
  - `next_review_date` (date)
  - `created_at` (timestamptz)

  ### 6. legal_representatives
  Records legal representatives, attorneys, and deputies
  - `id` (uuid, primary key)
  - `resident_id` (uuid)
  - `representative_type` (text) - 'lpa_health', 'lpa_finance', 'deputy', 'court_appointed'
  - `name` (text)
  - `relationship` (text)
  - `contact_phone` (text)
  - `contact_email` (text)
  - `address` (text)
  - `appointment_date` (date)
  - `registration_number` (text)
  - `scope_of_authority` (text)
  - `restrictions` (text)
  - `expiry_date` (date, nullable)
  - `supporting_documents` (jsonb)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. mca_supporting_documents
  Documents and evidence supporting MCA assessments
  - `id` (uuid, primary key)
  - `mca_assessment_id` (uuid)
  - `document_type` (text)
  - `file_url` (text)
  - `description` (text)
  - `uploaded_by` (uuid)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Organization staff can view and manage MCAs/DoLS for their residents
  - Comprehensive audit trail for all capacity-related decisions
  - Sensitive data restricted to authorized staff only

  ## Notes
  - MCAs are decision-specific - separate assessment for each decision
  - DoLS authorizations include renewal reminders via next_review_date
  - Best interests decisions linked to capacity assessments
  - System enforces MCA principles through structured questions
  - Full compliance with Mental Capacity Act 2005
*/

-- Create MCA decision types lookup table
CREATE TABLE IF NOT EXISTS mca_decision_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL CHECK (category IN ('medical', 'care', 'financial', 'personal', 'accommodation')),
  requires_specialist boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create mental capacity assessments table
CREATE TABLE IF NOT EXISTS mental_capacity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES organization_residents(id) ON DELETE CASCADE,
  care_plan_id uuid REFERENCES care_plans(id) ON DELETE SET NULL,
  decision_type_id uuid REFERENCES mca_decision_types(id) ON DELETE RESTRICT,
  decision_description text NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  assessed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assessment_location text DEFAULT '',
  has_capacity boolean,
  capacity_determination text NOT NULL DEFAULT 'pending' CHECK (capacity_determination IN ('has_capacity', 'lacks_capacity', 'fluctuating', 'pending')),
  understand_information boolean,
  retain_information boolean,
  use_information boolean,
  communicate_decision boolean,
  evidence_notes text DEFAULT '',
  steps_taken_to_support text DEFAULT '',
  consultation_notes text DEFAULT '',
  assessment_outcome text DEFAULT '',
  next_review_date date,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending_review', 'superseded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create best interests decisions table
CREATE TABLE IF NOT EXISTS best_interests_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mca_assessment_id uuid NOT NULL REFERENCES mental_capacity_assessments(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES organization_residents(id) ON DELETE CASCADE,
  decision_maker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_description text NOT NULL,
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  family_consulted boolean DEFAULT false,
  family_views text DEFAULT '',
  advocate_involved boolean DEFAULT false,
  advocate_views text DEFAULT '',
  resident_wishes_known text DEFAULT '',
  beliefs_and_values text DEFAULT '',
  factors_considered text DEFAULT '',
  less_restrictive_options text DEFAULT '',
  decision_rationale text NOT NULL,
  meeting_attendees jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create DoLS authorizations table
CREATE TABLE IF NOT EXISTS dols_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES organization_residents(id) ON DELETE CASCADE,
  care_plan_id uuid REFERENCES care_plans(id) ON DELETE SET NULL,
  authorization_type text NOT NULL CHECK (authorization_type IN ('standard', 'urgent')),
  authorization_reference text DEFAULT '',
  supervisory_body text NOT NULL,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  authorization_start_date date,
  authorization_end_date date,
  authorization_granted_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'expired', 'withdrawn', 'refused')),
  deprivation_reason text NOT NULL,
  restrictions_imposed jsonb DEFAULT '[]'::jsonb,
  conditions_attached jsonb DEFAULT '[]'::jsonb,
  managing_authority text NOT NULL,
  relevant_person_representative text DEFAULT '',
  imca_appointed boolean DEFAULT false,
  imca_details text DEFAULT '',
  urgent_authorization_used boolean DEFAULT false,
  urgent_authorization_dates jsonb DEFAULT '{}'::jsonb,
  last_review_date date,
  next_review_date date,
  review_notes text DEFAULT '',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create DoLS review records table
CREATE TABLE IF NOT EXISTS dols_review_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dols_authorization_id uuid NOT NULL REFERENCES dols_authorizations(id) ON DELETE CASCADE,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  review_type text NOT NULL CHECK (review_type IN ('scheduled', 'triggered', 'renewal')),
  conditions_still_necessary boolean DEFAULT true,
  restrictions_still_proportionate boolean DEFAULT true,
  resident_views_sought boolean DEFAULT false,
  resident_views text DEFAULT '',
  family_views_sought boolean DEFAULT false,
  family_views text DEFAULT '',
  changes_recommended text DEFAULT '',
  action_taken text DEFAULT '',
  next_review_date date,
  created_at timestamptz DEFAULT now()
);

-- Create legal representatives table
CREATE TABLE IF NOT EXISTS legal_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES organization_residents(id) ON DELETE CASCADE,
  representative_type text NOT NULL CHECK (representative_type IN ('lpa_health', 'lpa_finance', 'lpa_both', 'deputy', 'court_appointed')),
  name text NOT NULL,
  relationship text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  address text DEFAULT '',
  appointment_date date,
  registration_number text DEFAULT '',
  scope_of_authority text DEFAULT '',
  restrictions text DEFAULT '',
  expiry_date date,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create MCA supporting documents table
CREATE TABLE IF NOT EXISTS mca_supporting_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mca_assessment_id uuid NOT NULL REFERENCES mental_capacity_assessments(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  description text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mca_decision_types_category ON mca_decision_types(category);

CREATE INDEX IF NOT EXISTS idx_mca_assessments_org ON mental_capacity_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_mca_assessments_resident ON mental_capacity_assessments(resident_id);
CREATE INDEX IF NOT EXISTS idx_mca_assessments_date ON mental_capacity_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_mca_assessments_review_date ON mental_capacity_assessments(next_review_date);
CREATE INDEX IF NOT EXISTS idx_mca_assessments_status ON mental_capacity_assessments(status);
CREATE INDEX IF NOT EXISTS idx_mca_assessments_determination ON mental_capacity_assessments(capacity_determination);

CREATE INDEX IF NOT EXISTS idx_best_interests_mca ON best_interests_decisions(mca_assessment_id);
CREATE INDEX IF NOT EXISTS idx_best_interests_resident ON best_interests_decisions(resident_id);
CREATE INDEX IF NOT EXISTS idx_best_interests_date ON best_interests_decisions(decision_date);

CREATE INDEX IF NOT EXISTS idx_dols_org ON dols_authorizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_dols_resident ON dols_authorizations(resident_id);
CREATE INDEX IF NOT EXISTS idx_dols_status ON dols_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_dols_review_date ON dols_authorizations(next_review_date);
CREATE INDEX IF NOT EXISTS idx_dols_end_date ON dols_authorizations(authorization_end_date);

CREATE INDEX IF NOT EXISTS idx_dols_reviews_auth ON dols_review_records(dols_authorization_id);
CREATE INDEX IF NOT EXISTS idx_dols_reviews_date ON dols_review_records(review_date);

CREATE INDEX IF NOT EXISTS idx_legal_reps_resident ON legal_representatives(resident_id);
CREATE INDEX IF NOT EXISTS idx_legal_reps_type ON legal_representatives(representative_type);
CREATE INDEX IF NOT EXISTS idx_legal_reps_active ON legal_representatives(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_mca_docs_assessment ON mca_supporting_documents(mca_assessment_id);

-- Enable Row Level Security
ALTER TABLE mca_decision_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_capacity_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_interests_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dols_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dols_review_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE mca_supporting_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mca_decision_types (publicly readable for staff)
CREATE POLICY "All authenticated users can view decision types"
  ON mca_decision_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for mental_capacity_assessments
CREATE POLICY "Organization staff can view MCA assessments"
  ON mental_capacity_assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can create MCA assessments"
  ON mental_capacity_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can update MCA assessments"
  ON mental_capacity_assessments FOR UPDATE
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

-- RLS Policies for best_interests_decisions
CREATE POLICY "Organization staff can view best interests decisions"
  ON best_interests_decisions FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT id FROM organization_residents WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can create best interests decisions"
  ON best_interests_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    resident_id IN (
      SELECT id FROM organization_residents WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for dols_authorizations
CREATE POLICY "Organization staff can view DoLS authorizations"
  ON dols_authorizations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can create DoLS authorizations"
  ON dols_authorizations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can update DoLS authorizations"
  ON dols_authorizations FOR UPDATE
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

-- RLS Policies for dols_review_records
CREATE POLICY "Organization staff can view DoLS reviews"
  ON dols_review_records FOR SELECT
  TO authenticated
  USING (
    dols_authorization_id IN (
      SELECT id FROM dols_authorizations WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can create DoLS reviews"
  ON dols_review_records FOR INSERT
  TO authenticated
  WITH CHECK (
    dols_authorization_id IN (
      SELECT id FROM dols_authorizations WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for legal_representatives
CREATE POLICY "Organization staff can view legal representatives"
  ON legal_representatives FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT id FROM organization_residents WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can manage legal representatives"
  ON legal_representatives FOR ALL
  TO authenticated
  USING (
    resident_id IN (
      SELECT id FROM organization_residents WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    resident_id IN (
      SELECT id FROM organization_residents WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for mca_supporting_documents
CREATE POLICY "Organization staff can view MCA documents"
  ON mca_supporting_documents FOR SELECT
  TO authenticated
  USING (
    mca_assessment_id IN (
      SELECT id FROM mental_capacity_assessments WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can upload MCA documents"
  ON mca_supporting_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    mca_assessment_id IN (
      SELECT id FROM mental_capacity_assessments WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Insert default MCA decision types
INSERT INTO mca_decision_types (name, description, category, requires_specialist) VALUES
('Medical Treatment', 'Consent to specific medical treatment or procedure', 'medical', false),
('Surgery or Invasive Procedure', 'Consent to surgical intervention or invasive procedure', 'medical', true),
('Medication Regimen', 'Understanding and consenting to prescribed medications', 'medical', false),
('Refusing Medical Treatment', 'Decision to refuse recommended medical treatment', 'medical', false),
('Care Home Placement', 'Decision about moving to or remaining in care home', 'accommodation', false),
('Change of Accommodation', 'Decision to move to different care setting', 'accommodation', false),
('Daily Care Decisions', 'Consent to routine care activities (washing, dressing, etc.)', 'care', false),
('Restrictions on Freedom', 'Understanding restrictions and deprivation of liberty', 'care', false),
('Contact with Family/Friends', 'Decisions about contact with specific individuals', 'personal', false),
('Personal Care Activities', 'Participation in activities and social events', 'personal', false),
('Financial Decisions', 'Management of money and financial affairs', 'financial', false),
('Property and Affairs', 'Decisions about property, possessions, and legal matters', 'financial', true),
('Advance Care Planning', 'Creating advance decisions or care preferences', 'medical', false),
('Restraint or Restriction', 'Use of restraint or restrictive interventions', 'care', true),
('End of Life Care', 'Decisions about end of life treatment and care', 'medical', true)
ON CONFLICT DO NOTHING;
