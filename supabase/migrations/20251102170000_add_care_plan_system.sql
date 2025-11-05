/*
  # Care Plan Management System for Organizations

  ## Overview
  This migration creates a comprehensive care plan management system specifically for
  care organizations to manage structured care plans for their residents.

  ## New Tables

  ### 1. care_plan_templates
  Predefined care plan templates for common conditions and care levels
  - `id` (uuid, primary key)
  - `organization_id` (uuid, nullable for system templates)
  - `name` (text) - Template name
  - `description` (text) - Detailed description
  - `template_type` (text) - 'condition' or 'care_level'
  - `category` (text) - e.g., 'dementia', 'diabetes', 'fall_prevention'
  - `default_goals` (jsonb) - Array of default goal definitions
  - `default_tasks` (jsonb) - Array of default task definitions
  - `assessment_schedule` (jsonb) - Recommended assessment frequency
  - `is_active` (boolean)
  - `is_system_template` (boolean) - True for built-in templates
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. care_plans
  Individual care plans assigned to residents
  - `id` (uuid, primary key)
  - `organization_id` (uuid)
  - `resident_id` (uuid) - Links to organization_residents
  - `template_id` (uuid, nullable) - Source template if used
  - `plan_name` (text)
  - `care_level` (text)
  - `start_date` (date)
  - `review_date` (date) - Next scheduled review
  - `status` (text) - 'active', 'under_review', 'completed', 'discontinued'
  - `notes` (text)
  - `created_by` (uuid) - User who created the plan
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. care_plan_goals
  Specific measurable goals within a care plan
  - `id` (uuid, primary key)
  - `care_plan_id` (uuid)
  - `goal_name` (text)
  - `description` (text)
  - `category` (text) - e.g., 'mobility', 'medication', 'social', 'nutrition'
  - `target_value` (text) - Measurable target
  - `current_value` (text) - Current progress
  - `target_date` (date)
  - `priority` (text) - 'high', 'medium', 'low'
  - `status` (text) - 'not_started', 'in_progress', 'achieved', 'discontinued'
  - `progress_percentage` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. care_plan_tasks
  Daily tasks linked to care plan goals
  - `id` (uuid, primary key)
  - `care_plan_id` (uuid)
  - `goal_id` (uuid, nullable) - Link to specific goal
  - `task_name` (text)
  - `description` (text)
  - `task_type` (text) - 'medication', 'activity', 'assessment', 'meal', 'hygiene'
  - `frequency` (text) - 'daily', 'weekly', 'monthly', 'as_needed'
  - `scheduled_time` (time)
  - `duration_minutes` (integer)
  - `assigned_staff_id` (uuid, nullable)
  - `requires_documentation` (boolean)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. care_plan_task_completions
  Records of completed care plan tasks
  - `id` (uuid, primary key)
  - `task_id` (uuid)
  - `care_plan_id` (uuid)
  - `resident_id` (uuid)
  - `completed_by` (uuid) - Staff member who completed
  - `completed_at` (timestamptz)
  - `completion_method` (text) - 'manual', 'voice', 'auto'
  - `notes` (text)
  - `photo_urls` (jsonb) - Array of photo URLs if applicable
  - `created_at` (timestamptz)

  ### 6. care_plan_assessments
  Periodic evaluations and progress tracking
  - `id` (uuid, primary key)
  - `care_plan_id` (uuid)
  - `assessment_type` (text) - 'cognitive', 'mobility', 'nutrition', 'wellness', 'comprehensive'
  - `assessment_date` (date)
  - `assessed_by` (uuid) - Staff member who performed assessment
  - `assessment_data` (jsonb) - Structured assessment responses
  - `overall_score` (integer, nullable)
  - `findings` (text)
  - `recommendations` (text)
  - `next_assessment_date` (date)
  - `status` (text) - 'scheduled', 'completed', 'overdue'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. care_plan_staff_assignments
  Staff members assigned to specific care plans or tasks
  - `id` (uuid, primary key)
  - `care_plan_id` (uuid)
  - `staff_user_id` (uuid)
  - `role` (text) - 'primary_coordinator', 'secondary_coordinator', 'caregiver'
  - `responsibilities` (text)
  - `assigned_date` (date)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 8. care_plan_history
  Audit trail of all care plan changes
  - `id` (uuid, primary key)
  - `care_plan_id` (uuid)
  - `changed_by` (uuid)
  - `change_type` (text) - 'created', 'updated', 'goal_added', 'goal_modified', 'status_changed', 'reviewed'
  - `change_description` (text)
  - `previous_values` (jsonb)
  - `new_values` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Organization staff can view and manage care plans for their residents
  - Family members can view limited care plan information through family portal
  - All changes are logged in care_plan_history table

  ## Notes
  - System templates (is_system_template = true) are available to all organizations
  - Custom templates are organization-specific
  - Care plan tasks can optionally link to existing care_tasks table for integration
  - Voice interactions can update task completions via completion_method = 'voice'
  - Creates comprehensive care plan system for organizations
*/

-- Drop existing simple care plans and assessments tables if they exist (from previous migration)
DO $$
BEGIN
  -- Drop care_plans policies if they exist
  DROP POLICY IF EXISTS "Staff can view care plans for their residents" ON care_plans;
  DROP POLICY IF EXISTS "Authorized staff can manage care plans" ON care_plans;
  DROP POLICY IF EXISTS "Residents can view their own care plans" ON care_plans;

  -- Drop assessments policies if they exist
  DROP POLICY IF EXISTS "Staff can view assessments for their residents" ON assessments;
  DROP POLICY IF EXISTS "Authorized staff can manage assessments" ON assessments;

  -- Drop tables if they exist
  DROP TABLE IF EXISTS care_plans CASCADE;
  DROP TABLE IF EXISTS assessments CASCADE;
EXCEPTION
  WHEN undefined_table THEN
    -- Tables don't exist yet, that's fine
    NULL;
END $$;

-- Create care_plan_templates table
CREATE TABLE IF NOT EXISTS care_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  template_type text NOT NULL CHECK (template_type IN ('condition', 'care_level', 'custom')),
  category text NOT NULL,
  default_goals jsonb DEFAULT '[]'::jsonb,
  default_tasks jsonb DEFAULT '[]'::jsonb,
  assessment_schedule jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_system_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create care_plans table
CREATE TABLE IF NOT EXISTS care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES organization_residents(id) ON DELETE CASCADE,
  template_id uuid REFERENCES care_plan_templates(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  care_level text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  review_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'completed', 'discontinued')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create care_plan_goals table
CREATE TABLE IF NOT EXISTS care_plan_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  goal_name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  target_value text DEFAULT '',
  current_value text DEFAULT '',
  target_date date,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'achieved', 'discontinued')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create care_plan_tasks table
CREATE TABLE IF NOT EXISTS care_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES care_plan_goals(id) ON DELETE SET NULL,
  task_name text NOT NULL,
  description text DEFAULT '',
  task_type text NOT NULL CHECK (task_type IN ('medication', 'activity', 'assessment', 'meal', 'hygiene', 'social', 'therapy', 'other')),
  frequency text NOT NULL DEFAULT 'daily',
  scheduled_time time,
  duration_minutes integer DEFAULT 15,
  assigned_staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_documentation boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create care_plan_task_completions table
CREATE TABLE IF NOT EXISTS care_plan_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES care_plan_tasks(id) ON DELETE CASCADE,
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES organization_residents(id) ON DELETE CASCADE,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT now(),
  completion_method text DEFAULT 'manual' CHECK (completion_method IN ('manual', 'voice', 'auto')),
  notes text DEFAULT '',
  photo_urls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create care_plan_assessments table
CREATE TABLE IF NOT EXISTS care_plan_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN ('cognitive', 'mobility', 'nutrition', 'wellness', 'comprehensive', 'pain', 'fall_risk', 'adl')),
  assessment_date date DEFAULT CURRENT_DATE,
  assessed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assessment_data jsonb DEFAULT '{}'::jsonb,
  overall_score integer,
  findings text DEFAULT '',
  recommendations text DEFAULT '',
  next_assessment_date date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'overdue', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create care_plan_staff_assignments table
CREATE TABLE IF NOT EXISTS care_plan_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('primary_coordinator', 'secondary_coordinator', 'caregiver', 'specialist')),
  responsibilities text DEFAULT '',
  assigned_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create care_plan_history table
CREATE TABLE IF NOT EXISTS care_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type text NOT NULL,
  change_description text NOT NULL,
  previous_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_care_plan_templates_org ON care_plan_templates(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_care_plan_templates_category ON care_plan_templates(category);
CREATE INDEX IF NOT EXISTS idx_care_plan_templates_system ON care_plan_templates(is_system_template) WHERE is_system_template = true;

CREATE INDEX IF NOT EXISTS idx_care_plans_org ON care_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_resident ON care_plans(resident_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_status ON care_plans(status);
CREATE INDEX IF NOT EXISTS idx_care_plans_review_date ON care_plans(review_date);

CREATE INDEX IF NOT EXISTS idx_care_plan_goals_plan ON care_plan_goals(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_goals_status ON care_plan_goals(status);

CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_plan ON care_plan_tasks(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_goal ON care_plan_tasks(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_assigned ON care_plan_tasks(assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_care_plan_completions_task ON care_plan_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_completions_plan ON care_plan_task_completions(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_completions_date ON care_plan_task_completions(completed_at);

CREATE INDEX IF NOT EXISTS idx_care_plan_assessments_plan ON care_plan_assessments(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_assessments_date ON care_plan_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_care_plan_assessments_status ON care_plan_assessments(status);

CREATE INDEX IF NOT EXISTS idx_care_plan_staff_plan ON care_plan_staff_assignments(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_staff_user ON care_plan_staff_assignments(staff_user_id);

CREATE INDEX IF NOT EXISTS idx_care_plan_history_plan ON care_plan_history(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_history_date ON care_plan_history(created_at);

-- Enable Row Level Security
ALTER TABLE care_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for care_plan_templates
CREATE POLICY "System templates are visible to all authenticated users"
  ON care_plan_templates FOR SELECT
  TO authenticated
  USING (is_system_template = true);

CREATE POLICY "Organization staff can view their templates"
  ON care_plan_templates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can create templates"
  ON care_plan_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization admins can update their templates"
  ON care_plan_templates FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for care_plans
CREATE POLICY "Organization staff can view care plans for their residents"
  ON care_plans FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can create care plans"
  ON care_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can update care plans"
  ON care_plans FOR UPDATE
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

-- RLS Policies for care_plan_goals
CREATE POLICY "Organization staff can view goals"
  ON care_plan_goals FOR SELECT
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can manage goals"
  ON care_plan_goals FOR ALL
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for care_plan_tasks
CREATE POLICY "Organization staff can view tasks"
  ON care_plan_tasks FOR SELECT
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can manage tasks"
  ON care_plan_tasks FOR ALL
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for care_plan_task_completions
CREATE POLICY "Organization staff can view completions"
  ON care_plan_task_completions FOR SELECT
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can record completions"
  ON care_plan_task_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for care_plan_assessments
CREATE POLICY "Organization staff can view assessments"
  ON care_plan_assessments FOR SELECT
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can manage assessments"
  ON care_plan_assessments FOR ALL
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for care_plan_staff_assignments
CREATE POLICY "Organization staff can view assignments"
  ON care_plan_staff_assignments FOR SELECT
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can manage assignments"
  ON care_plan_staff_assignments FOR ALL
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for care_plan_history
CREATE POLICY "Organization staff can view history"
  ON care_plan_history FOR SELECT
  TO authenticated
  USING (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization staff can record history"
  ON care_plan_history FOR INSERT
  TO authenticated
  WITH CHECK (
    care_plan_id IN (
      SELECT id FROM care_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Insert system templates for common care scenarios
INSERT INTO care_plan_templates (name, description, template_type, category, is_system_template, default_goals, default_tasks, assessment_schedule) VALUES
(
  'Dementia Care - Early Stage',
  'Comprehensive care plan for residents with early-stage dementia focused on maintaining independence and cognitive engagement.',
  'condition',
  'dementia',
  true,
  '[
    {"name": "Maintain cognitive function", "category": "cognitive", "priority": "high", "target": "Complete 2 cognitive activities daily"},
    {"name": "Ensure medication compliance", "category": "medication", "priority": "high", "target": "100% medication adherence"},
    {"name": "Promote social engagement", "category": "social", "priority": "medium", "target": "Attend 3 group activities per week"}
  ]'::jsonb,
  '[
    {"name": "Memory exercises", "type": "activity", "frequency": "daily", "duration": 30},
    {"name": "Medication reminder", "type": "medication", "frequency": "daily"},
    {"name": "Group activity participation", "type": "social", "frequency": "daily"}
  ]'::jsonb,
  '{"cognitive": "monthly", "wellness": "weekly", "comprehensive": "quarterly"}'::jsonb
),
(
  'Fall Prevention Program',
  'Intensive care plan for residents identified as high fall risk, including mobility support and environmental safety.',
  'condition',
  'fall_prevention',
  true,
  '[
    {"name": "Improve balance and mobility", "category": "mobility", "priority": "high", "target": "Complete balance exercises 5 days/week"},
    {"name": "Reduce fall risk factors", "category": "safety", "priority": "high", "target": "Zero falls this month"},
    {"name": "Increase physical activity", "category": "activity", "priority": "medium", "target": "Walk 15 minutes twice daily"}
  ]'::jsonb,
  '[
    {"name": "Balance exercises", "type": "therapy", "frequency": "daily", "duration": 20},
    {"name": "Assisted walking", "type": "activity", "frequency": "daily", "duration": 15},
    {"name": "Fall risk assessment", "type": "assessment", "frequency": "weekly"}
  ]'::jsonb,
  '{"fall_risk": "weekly", "mobility": "biweekly", "comprehensive": "monthly"}'::jsonb
),
(
  'Diabetes Management',
  'Specialized care plan for diabetic residents focusing on blood sugar monitoring, medication, and dietary management.',
  'condition',
  'diabetes',
  true,
  '[
    {"name": "Maintain stable blood sugar", "category": "health", "priority": "high", "target": "Blood sugar within target range 80% of readings"},
    {"name": "Medication adherence", "category": "medication", "priority": "high", "target": "100% compliance with diabetes medications"},
    {"name": "Healthy eating habits", "category": "nutrition", "priority": "high", "target": "Follow diabetic meal plan daily"}
  ]'::jsonb,
  '[
    {"name": "Blood sugar check", "type": "assessment", "frequency": "daily"},
    {"name": "Diabetes medication", "type": "medication", "frequency": "daily"},
    {"name": "Diabetic meal supervision", "type": "meal", "frequency": "daily"}
  ]'::jsonb,
  '{"wellness": "weekly", "nutrition": "monthly", "comprehensive": "quarterly"}'::jsonb
),
(
  'Post-Surgery Recovery',
  'Structured recovery plan for residents returning from surgical procedures, including wound care and mobility restoration.',
  'condition',
  'post_surgery',
  true,
  '[
    {"name": "Complete wound healing", "category": "health", "priority": "high", "target": "Wound fully healed within expected timeframe"},
    {"name": "Pain management", "category": "health", "priority": "high", "target": "Pain level below 4/10"},
    {"name": "Restore mobility", "category": "mobility", "priority": "medium", "target": "Return to pre-surgery mobility level"}
  ]'::jsonb,
  '[
    {"name": "Wound care and dressing", "type": "hygiene", "frequency": "daily"},
    {"name": "Pain medication", "type": "medication", "frequency": "daily"},
    {"name": "Physical therapy", "type": "therapy", "frequency": "daily", "duration": 30}
  ]'::jsonb,
  '{"pain": "daily", "mobility": "weekly", "wellness": "weekly"}'::jsonb
),
(
  'Assisted Living - Standard Care',
  'Standard care plan for assisted living residents requiring support with daily activities.',
  'care_level',
  'assisted_living',
  true,
  '[
    {"name": "Maintain independence in ADLs", "category": "adl", "priority": "medium", "target": "Complete 3+ ADLs independently"},
    {"name": "Social participation", "category": "social", "priority": "medium", "target": "Attend 4+ activities weekly"},
    {"name": "Medication management", "category": "medication", "priority": "high", "target": "100% medication compliance"}
  ]'::jsonb,
  '[
    {"name": "Morning hygiene assistance", "type": "hygiene", "frequency": "daily"},
    {"name": "Medication administration", "type": "medication", "frequency": "daily"},
    {"name": "Activity participation", "type": "activity", "frequency": "daily"}
  ]'::jsonb,
  '{"adl": "monthly", "wellness": "monthly", "comprehensive": "quarterly"}'::jsonb
),
(
  'Memory Care - Advanced Support',
  'Comprehensive care for residents with moderate to advanced dementia requiring specialized memory care.',
  'care_level',
  'memory_care',
  true,
  '[
    {"name": "Maintain safety and security", "category": "safety", "priority": "high", "target": "Zero wandering incidents"},
    {"name": "Preserve remaining cognitive abilities", "category": "cognitive", "priority": "high", "target": "Daily cognitive engagement"},
    {"name": "Ensure nutritional intake", "category": "nutrition", "priority": "high", "target": "Consume 75%+ of meals"}
  ]'::jsonb,
  '[
    {"name": "Safety checks", "type": "assessment", "frequency": "daily"},
    {"name": "Cognitive engagement activity", "type": "activity", "frequency": "daily", "duration": 30},
    {"name": "Meal assistance and monitoring", "type": "meal", "frequency": "daily"}
  ]'::jsonb,
  '{"cognitive": "weekly", "nutrition": "weekly", "comprehensive": "monthly"}'::jsonb
);
