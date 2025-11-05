/*
  # Grace Notes - Professional Care Documentation System

  1. New Tables
    - `grace_notes_practitioners`
      - Practitioner profiles for independent care professionals
      - Links to auth.users for authentication
      - Includes professional registration details, specializations

    - `grace_notes_clients`
      - Client records managed by practitioners
      - Personal details, care needs, risk assessments
      - Tracks client status and assigned practitioner

    - `grace_notes_visits`
      - Visit records with GPS verification
      - Photo documentation, duration tracking
      - Links to clients and practitioners

    - `grace_notes_visit_notes`
      - Detailed notes from visits
      - AI-generated summaries
      - Status tracking (draft, completed, signed)

    - `grace_notes_assessments`
      - Statutory assessments (Care Act, MCA, Carers, CHC)
      - Template-based structure
      - Compliance tracking

    - `grace_notes_assessment_sections`
      - Individual sections within assessments
      - Stores responses to assessment questions

    - `grace_notes_documents`
      - Document storage and versioning
      - Care plans, reports, letters

    - `grace_notes_tasks`
      - Task management for practitioners
      - Client-related tasks, follow-ups

    - `grace_notes_audit_log`
      - Comprehensive audit trail for CQC compliance
      - Tracks all actions on client records

  2. Security
    - Enable RLS on all tables
    - Practitioners can only access their own clients and data
    - Audit logs are append-only

  3. Important Notes
    - Mobile-first design with offline sync support
    - GPS and photo storage for field work
    - UK statutory assessment templates included
    - CQC compliance built-in
*/

-- Practitioners table
CREATE TABLE IF NOT EXISTS grace_notes_practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Professional details
  professional_title text NOT NULL,
  registration_number text,
  registration_body text,
  specializations text[] DEFAULT '{}',

  -- Contact
  phone text,
  email text,

  -- Organization
  organization_name text,
  organization_type text,

  -- Subscription
  subscription_plan text DEFAULT 'solo',
  subscription_status text DEFAULT 'trial',
  max_clients integer DEFAULT 20,

  -- Settings
  default_visit_duration integer DEFAULT 60,
  enable_gps_verification boolean DEFAULT true,
  enable_offline_mode boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS grace_notes_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE NOT NULL,

  -- Personal details
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  nhs_number text,

  -- Contact
  phone text,
  email text,
  address text,
  postcode text,

  -- Care details
  care_type text,
  risk_level text DEFAULT 'low',
  safeguarding_concerns text[] DEFAULT '{}',

  -- Status
  status text DEFAULT 'active',
  start_date date DEFAULT CURRENT_DATE,
  end_date date,

  -- Emergency contacts
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  -- Notes
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Visits table
CREATE TABLE IF NOT EXISTS grace_notes_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES grace_notes_clients(id) ON DELETE CASCADE NOT NULL,
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE NOT NULL,

  -- Visit details
  visit_type text NOT NULL,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  actual_start timestamptz,
  actual_end timestamptz,

  -- Location verification
  check_in_location point,
  check_in_address text,
  check_out_location point,

  -- Status
  status text DEFAULT 'scheduled',

  -- Attachments
  photo_urls text[] DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Visit notes table
CREATE TABLE IF NOT EXISTS grace_notes_visit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES grace_notes_visits(id) ON DELETE CASCADE NOT NULL,
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE NOT NULL,

  -- Content
  raw_transcript text,
  structured_note jsonb,
  ai_summary text,

  -- Observations
  physical_health_notes text,
  mental_health_notes text,
  social_notes text,
  environmental_notes text,

  -- Actions
  actions_taken text[] DEFAULT '{}',
  follow_up_required boolean DEFAULT false,
  follow_up_notes text,

  -- Status
  status text DEFAULT 'draft',
  signed_at timestamptz,
  signature_data jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assessment templates
CREATE TABLE IF NOT EXISTS grace_notes_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES grace_notes_clients(id) ON DELETE CASCADE NOT NULL,
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE NOT NULL,

  -- Assessment details
  assessment_type text NOT NULL,
  assessment_name text NOT NULL,
  template_version text DEFAULT '1.0',

  -- Status
  status text DEFAULT 'in_progress',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  -- Review
  review_date date,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES grace_notes_practitioners(id),

  -- Outcome
  outcome_summary text,
  recommendations text[] DEFAULT '{}',

  -- Compliance
  statutory_requirement text,
  compliance_notes text,

  -- Signature
  signed_at timestamptz,
  signature_data jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assessment sections
CREATE TABLE IF NOT EXISTS grace_notes_assessment_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES grace_notes_assessments(id) ON DELETE CASCADE NOT NULL,

  -- Section details
  section_key text NOT NULL,
  section_title text NOT NULL,
  section_order integer NOT NULL,

  -- Content
  questions jsonb DEFAULT '[]',
  responses jsonb DEFAULT '{}',

  -- AI assistance
  ai_suggestions text[] DEFAULT '{}',

  -- Status
  completed boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS grace_notes_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES grace_notes_clients(id) ON DELETE CASCADE NOT NULL,
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE NOT NULL,

  -- Document details
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text,

  -- Versioning
  version integer DEFAULT 1,
  parent_document_id uuid REFERENCES grace_notes_documents(id),

  -- Content
  content jsonb,

  -- Status
  status text DEFAULT 'draft',

  -- Related records
  related_visit_id uuid REFERENCES grace_notes_visits(id),
  related_assessment_id uuid REFERENCES grace_notes_assessments(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS grace_notes_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES grace_notes_clients(id) ON DELETE SET NULL,

  -- Task details
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',

  -- Dates
  due_date date,
  completed_at timestamptz,

  -- Status
  status text DEFAULT 'pending',

  -- Related records
  related_visit_id uuid REFERENCES grace_notes_visits(id),
  related_assessment_id uuid REFERENCES grace_notes_assessments(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS grace_notes_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) NOT NULL,

  -- Action details
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,

  -- Changes
  old_values jsonb,
  new_values jsonb,

  -- Context
  ip_address inet,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE grace_notes_practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_visit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_audit_log ENABLE ROW LEVEL SECURITY;

-- Practitioners policies
CREATE POLICY "Practitioners can view own profile"
  ON grace_notes_practitioners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Practitioners can update own profile"
  ON grace_notes_practitioners FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert practitioner profile"
  ON grace_notes_practitioners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clients policies
CREATE POLICY "Practitioners can view own clients"
  ON grace_notes_clients FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can insert clients"
  ON grace_notes_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update own clients"
  ON grace_notes_clients FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can delete own clients"
  ON grace_notes_clients FOR DELETE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Visits policies
CREATE POLICY "Practitioners can view own visits"
  ON grace_notes_visits FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can insert visits"
  ON grace_notes_visits FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update own visits"
  ON grace_notes_visits FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can delete own visits"
  ON grace_notes_visits FOR DELETE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Visit notes policies
CREATE POLICY "Practitioners can view own visit notes"
  ON grace_notes_visit_notes FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can insert visit notes"
  ON grace_notes_visit_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update own visit notes"
  ON grace_notes_visit_notes FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Assessments policies
CREATE POLICY "Practitioners can view own assessments"
  ON grace_notes_assessments FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can insert assessments"
  ON grace_notes_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update own assessments"
  ON grace_notes_assessments FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Assessment sections policies
CREATE POLICY "Practitioners can view own assessment sections"
  ON grace_notes_assessment_sections FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM grace_notes_assessments
      WHERE practitioner_id IN (
        SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Practitioners can insert assessment sections"
  ON grace_notes_assessment_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM grace_notes_assessments
      WHERE practitioner_id IN (
        SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Practitioners can update own assessment sections"
  ON grace_notes_assessment_sections FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM grace_notes_assessments
      WHERE practitioner_id IN (
        SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM grace_notes_assessments
      WHERE practitioner_id IN (
        SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
      )
    )
  );

-- Documents policies
CREATE POLICY "Practitioners can view own documents"
  ON grace_notes_documents FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can insert documents"
  ON grace_notes_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update own documents"
  ON grace_notes_documents FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can delete own documents"
  ON grace_notes_documents FOR DELETE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Practitioners can view own tasks"
  ON grace_notes_tasks FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can insert tasks"
  ON grace_notes_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update own tasks"
  ON grace_notes_tasks FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can delete own tasks"
  ON grace_notes_tasks FOR DELETE
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Audit log policies (append-only, read-only for practitioners)
CREATE POLICY "Practitioners can view own audit logs"
  ON grace_notes_audit_log FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs"
  ON grace_notes_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM grace_notes_practitioners WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practitioners_user_id ON grace_notes_practitioners(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_practitioner_id ON grace_notes_clients(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON grace_notes_clients(status);
CREATE INDEX IF NOT EXISTS idx_visits_client_id ON grace_notes_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_visits_practitioner_id ON grace_notes_visits(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_start ON grace_notes_visits(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_visit_notes_visit_id ON grace_notes_visit_notes(visit_id);
CREATE INDEX IF NOT EXISTS idx_assessments_client_id ON grace_notes_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_assessments_practitioner_id ON grace_notes_assessments(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment_id ON grace_notes_assessment_sections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON grace_notes_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_practitioner_id ON grace_notes_tasks(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON grace_notes_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_practitioner_id ON grace_notes_audit_log(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON grace_notes_audit_log(entity_type, entity_id);
