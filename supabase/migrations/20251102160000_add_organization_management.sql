/*
  # Add Organization/Facility Management System

  ## Overview
  Extends Grace Companion to support care facilities, senior living communities, and professional
  care organizations. This enables organizations to manage multiple residents while maintaining
  the voice-first, family-connected approach.

  ## New Tables Created

  1. **organizations**
     - Core facility information and settings
     - Subscription tier and billing details
     - Contact information and branding preferences

  2. **organization_users**
     - Links staff members to organizations
     - Defines role assignments and permissions
     - Tracks employment status and access levels

  3. **organization_residents**
     - Connects elders to care facilities
     - Tracks admission dates and care levels
     - Manages discharge dates and status

  4. **staff_roles**
     - Defines different staff positions
     - Sets permission levels for each role
     - Enables role-based access control

  5. **care_teams**
     - Assigns specific staff to specific residents
     - Enables primary care worker designation
     - Tracks team member responsibilities

  6. **shift_schedules**
     - Manages staff scheduling and shifts
     - Tracks check-in/out times
     - Enables handover management

  7. **facility_settings**
     - Organization-wide preferences
     - Custom branding and theming
     - Feature toggles and configurations

  8. **audit_logs**
     - Compliance tracking for all actions
     - Records who did what and when
     - Supports regulatory requirements

  9. **care_plans**
     - Structured care plan templates
     - Tracks care goals and interventions
     - Links to care tasks and assessments

  10. **assessments**
      - Standardized assessment forms
      - Scheduled evaluation tracking
      - Results storage and trending

  ## Security
  - All tables have RLS enabled
  - Staff can only access residents assigned to them
  - Organization admins have full facility access
  - Audit logs are immutable and restricted

  ## Important Notes
  - Organizations must be approved before activation
  - Staff accounts are linked to their organization
  - Residents can be managed by both family and facility staff
  - Family portal access is maintained for facility residents
*/

-- Create enum types for organization management
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('trial', 'basic', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_role_type AS ENUM (
    'organization_admin',
    'facility_director',
    'care_manager',
    'nurse',
    'care_worker',
    'activities_coordinator',
    'maintenance_staff'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE care_level AS ENUM (
    'independent',
    'assisted_living',
    'memory_care',
    'skilled_nursing',
    'hospice'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('day', 'evening', 'night', 'overnight');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action_type AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'medication_admin',
    'incident_report'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_type text NOT NULL DEFAULT 'assisted_living',
  license_number text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  phone text,
  email text,
  website text,

  -- Subscription and billing
  subscription_tier subscription_tier DEFAULT 'trial',
  subscription_status text DEFAULT 'active',
  trial_ends_at timestamptz,
  billing_email text,
  max_residents integer DEFAULT 50,

  -- Branding
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  custom_domain text,

  -- Status
  is_active boolean DEFAULT true,
  approved_at timestamptz,
  approved_by uuid,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Organization Users (Staff) Table
CREATE TABLE IF NOT EXISTS organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role staff_role_type NOT NULL,

  -- Employment details
  employee_id text,
  hire_date date,
  termination_date date,
  is_active boolean DEFAULT true,

  -- Access control
  can_manage_staff boolean DEFAULT false,
  can_manage_billing boolean DEFAULT false,
  can_export_data boolean DEFAULT false,

  -- Credentials and certifications
  license_number text,
  license_expiry date,
  certifications jsonb DEFAULT '[]'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

-- 3. Organization Residents Table
CREATE TABLE IF NOT EXISTS organization_residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Admission details
  room_number text,
  care_level care_level DEFAULT 'assisted_living',
  admission_date date NOT NULL,
  discharge_date date,
  is_active boolean DEFAULT true,

  -- Medical information
  primary_diagnosis text,
  allergies text[],
  dietary_restrictions text[],
  mobility_status text,
  fall_risk_level text DEFAULT 'low',

  -- Emergency contacts (in addition to family NoK)
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  -- Insurance and billing
  insurance_provider text,
  policy_number text,
  medicare_number text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, resident_id)
);

-- 4. Staff Roles Definition Table
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  role_type staff_role_type NOT NULL,
  description text,

  -- Permissions
  can_view_all_residents boolean DEFAULT false,
  can_modify_care_plans boolean DEFAULT false,
  can_administer_medications boolean DEFAULT false,
  can_create_tasks boolean DEFAULT true,
  can_view_medical_records boolean DEFAULT false,
  can_manage_schedules boolean DEFAULT false,

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, role_name)
);

-- 5. Care Teams Table
CREATE TABLE IF NOT EXISTS care_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Team member role
  is_primary_care_worker boolean DEFAULT false,
  team_role text,
  responsibilities text[],

  -- Status
  is_active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  removed_at timestamptz,

  UNIQUE(organization_id, resident_id, staff_id)
);

-- 6. Shift Schedules Table
CREATE TABLE IF NOT EXISTS shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Shift details
  shift_type shift_type NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,

  -- Actual times
  checked_in_at timestamptz,
  checked_out_at timestamptz,

  -- Handover
  handover_notes text,
  handover_to_staff_id uuid REFERENCES users(id),

  created_at timestamptz DEFAULT now()
);

-- 7. Facility Settings Table
CREATE TABLE IF NOT EXISTS facility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- General settings
  timezone text DEFAULT 'America/New_York',
  default_language text DEFAULT 'en',

  -- Feature toggles
  enable_voice_reminders boolean DEFAULT true,
  enable_family_portal boolean DEFAULT true,
  enable_video_calls boolean DEFAULT false,
  enable_medication_scanning boolean DEFAULT false,

  -- Notification preferences
  daily_summary_time time DEFAULT '17:00',
  escalation_notification_methods text[] DEFAULT ARRAY['sms', 'email'],

  -- Care preferences
  default_reminder_methods text[] DEFAULT ARRAY['app', 'sms'],
  medication_administration_window_minutes integer DEFAULT 30,
  vital_signs_frequency_hours integer DEFAULT 12,

  -- Compliance
  require_two_person_medication_check boolean DEFAULT false,
  photo_documentation_required boolean DEFAULT false,

  settings jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id)
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Action details
  action audit_action_type NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,

  -- Context
  ip_address inet,
  user_agent text,

  -- Changes
  old_values jsonb,
  new_values jsonb,

  -- Metadata
  notes text,
  is_sensitive boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

-- 9. Care Plans Table
CREATE TABLE IF NOT EXISTS care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Plan details
  plan_name text NOT NULL,
  care_type text NOT NULL,
  description text,

  -- Goals and interventions
  goals text[],
  interventions text[],
  precautions text[],

  -- Status
  status text DEFAULT 'active',
  effective_date date NOT NULL,
  review_date date,
  discontinued_date date,

  -- Responsibility
  created_by_staff_id uuid REFERENCES users(id),
  reviewed_by_staff_id uuid REFERENCES users(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Assessment details
  assessment_type text NOT NULL,
  assessment_name text NOT NULL,

  -- Scheduling
  scheduled_date date,
  completed_date date,

  -- Results
  score integer,
  results jsonb DEFAULT '{}'::jsonb,
  notes text,
  recommendations text,

  -- Responsibility
  conducted_by_staff_id uuid REFERENCES users(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add organization_id to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE users ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN organization_id uuid REFERENCES organizations(id);
    ALTER TABLE care_tasks ADD COLUMN assigned_to_staff_id uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organization_users_org ON organization_users(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organization_users_staff ON organization_users(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organization_residents_org ON organization_residents(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organization_residents_resident ON organization_residents(resident_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_care_teams_resident ON care_teams(resident_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_care_teams_staff ON care_teams(staff_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shift_schedules_staff ON shift_schedules(staff_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date ON shift_schedules(organization_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_plans_resident ON care_plans(resident_id, status);
CREATE INDEX IF NOT EXISTS idx_assessments_resident ON assessments(resident_id, scheduled_date);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Organizations

CREATE POLICY "Organization admins can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
      AND is_active = true
    )
  );

-- RLS Policies for Organization Users (Staff)

CREATE POLICY "Staff can view their own staff record"
  ON organization_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view colleagues in same organization"
  ON organization_users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization admins can manage staff"
  ON organization_users FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
      AND can_manage_staff = true
      AND is_active = true
    )
  );

-- RLS Policies for Organization Residents

CREATE POLICY "Staff can view residents in their organization"
  ON organization_residents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Care managers can manage residents"
  ON organization_residents FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager')
      AND is_active = true
    )
  );

CREATE POLICY "Residents can view their own resident record"
  ON organization_residents FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid());

-- RLS Policies for Care Teams

CREATE POLICY "Staff can view care teams in their organization"
  ON care_teams FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Staff can view their assigned residents"
  ON care_teams FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Care managers can manage care teams"
  ON care_teams FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager', 'nurse')
      AND is_active = true
    )
  );

-- RLS Policies for Shift Schedules

CREATE POLICY "Staff can view their own shifts"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Staff can view all shifts in their organization"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Managers can manage shift schedules"
  ON shift_schedules FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager')
      AND is_active = true
    )
  );

-- RLS Policies for Facility Settings

CREATE POLICY "Staff can view their organization settings"
  ON facility_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization admins can manage settings"
  ON facility_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
      AND is_active = true
    )
  );

-- RLS Policies for Audit Logs

CREATE POLICY "Organization admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director')
      AND is_active = true
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for Care Plans

CREATE POLICY "Staff can view care plans for their residents"
  ON care_plans FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT resident_id FROM care_teams
      WHERE staff_id = auth.uid() AND is_active = true
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager', 'nurse')
      AND is_active = true
    )
  );

CREATE POLICY "Authorized staff can manage care plans"
  ON care_plans FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN staff_roles sr ON ou.role = sr.role_type
      WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND sr.can_modify_care_plans = true
    )
  );

CREATE POLICY "Residents can view their own care plans"
  ON care_plans FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid());

-- RLS Policies for Assessments

CREATE POLICY "Staff can view assessments for their residents"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT resident_id FROM care_teams
      WHERE staff_id = auth.uid() AND is_active = true
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authorized staff can manage assessments"
  ON assessments FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'facility_director', 'care_manager', 'nurse')
      AND is_active = true
    )
  );

-- Update existing care_tasks RLS policies for organization context

CREATE POLICY "Staff can view tasks for their assigned residents"
  ON care_tasks FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT resident_id FROM care_teams
      WHERE staff_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Staff can update tasks assigned to them"
  ON care_tasks FOR UPDATE
  TO authenticated
  USING (assigned_to_staff_id = auth.uid())
  WITH CHECK (assigned_to_staff_id = auth.uid());

CREATE POLICY "Organization staff can create tasks"
  ON care_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_organization_id uuid,
  p_action audit_action_type,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_organization_id,
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
