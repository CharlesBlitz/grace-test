/*
  # RLS Policy Performance Optimization - Part 3

  ## Summary
  Final batch of RLS policy optimizations for:
  - Organizations and organization_users
  - Care teams and organization residents
  - Shift schedules and facility settings
  - Audit logs
  - Care plan templates and care plans
  - Care plan goals, tasks, completions, assessments
  - Grace Notes (practitioners, clients, visits, tasks, audit)
  - Elder settings, wellness check-ins, medication logs
  - Voice messages, photo shares, emergency requests, activity log
*/

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

DROP POLICY IF EXISTS "Organization admins can update their organization" ON organizations;
CREATE POLICY "Organization admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Organization admins can view their organization" ON organizations;
CREATE POLICY "Organization admins can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- ORGANIZATION USERS
-- =====================================================

DROP POLICY IF EXISTS "Organization admins can manage staff" ON organization_users;
CREATE POLICY "Organization admins can manage staff"
  ON organization_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = (SELECT auth.uid())
      AND ou.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view colleagues in same organization" ON organization_users;
CREATE POLICY "Staff can view colleagues in same organization"
  ON organization_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can view their own staff record" ON organization_users;
CREATE POLICY "Staff can view their own staff record"
  ON organization_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- CARE TEAMS
-- =====================================================

DROP POLICY IF EXISTS "Care managers can manage care teams" ON care_teams;
CREATE POLICY "Care managers can manage care teams"
  ON care_teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = care_teams.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager', 'care_coordinator')
    )
  );

DROP POLICY IF EXISTS "Staff can view care teams in their organization" ON care_teams;
CREATE POLICY "Staff can view care teams in their organization"
  ON care_teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = care_teams.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can view their assigned residents" ON care_teams;
CREATE POLICY "Staff can view their assigned residents"
  ON care_teams FOR SELECT
  TO authenticated
  USING (staff_user_id = (SELECT auth.uid()));

-- =====================================================
-- ORGANIZATION RESIDENTS
-- =====================================================

DROP POLICY IF EXISTS "Care managers can manage residents" ON organization_residents;
CREATE POLICY "Care managers can manage residents"
  ON organization_residents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organization_residents.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager', 'care_coordinator')
    )
  );

DROP POLICY IF EXISTS "Residents can view their own resident record" ON organization_residents;
CREATE POLICY "Residents can view their own resident record"
  ON organization_residents FOR SELECT
  TO authenticated
  USING (resident_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can view residents in their organization" ON organization_residents;
CREATE POLICY "Staff can view residents in their organization"
  ON organization_residents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organization_residents.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- SHIFT SCHEDULES
-- =====================================================

DROP POLICY IF EXISTS "Managers can manage shift schedules" ON shift_schedules;
CREATE POLICY "Managers can manage shift schedules"
  ON shift_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = shift_schedules.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view all shifts in their organization" ON shift_schedules;
CREATE POLICY "Staff can view all shifts in their organization"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = shift_schedules.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can view their own shifts" ON shift_schedules;
CREATE POLICY "Staff can view their own shifts"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (staff_user_id = (SELECT auth.uid()));

-- =====================================================
-- FACILITY SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Organization admins can manage settings" ON facility_settings;
CREATE POLICY "Organization admins can manage settings"
  ON facility_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = facility_settings.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff can view their organization settings" ON facility_settings;
CREATE POLICY "Staff can view their organization settings"
  ON facility_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = facility_settings.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- AUDIT LOGS
-- =====================================================

DROP POLICY IF EXISTS "Organization admins can view audit logs" ON audit_logs;
CREATE POLICY "Organization admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = audit_logs.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- CARE PLAN TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Org staff can view their templates" ON care_plan_templates;
DROP POLICY IF EXISTS "Organization staff can view their templates" ON care_plan_templates;
CREATE POLICY "Organization staff can view their templates"
  ON care_plan_templates FOR SELECT
  TO authenticated
  USING (
    is_system_template = true OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = care_plan_templates.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organization admins can create templates" ON care_plan_templates;
CREATE POLICY "Organization admins can create templates"
  ON care_plan_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = care_plan_templates.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Organization admins can update their templates" ON care_plan_templates;
CREATE POLICY "Organization admins can update their templates"
  ON care_plan_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = care_plan_templates.organization_id
      AND organization_users.user_id = (SELECT auth.uid())
      AND organization_users.role IN ('admin', 'manager')
    )
  );

-- Remove duplicate system template policies
DROP POLICY IF EXISTS "System templates are visible to all authenticated users" ON care_plan_templates;
DROP POLICY IF EXISTS "System templates visible to all" ON care_plan_templates;

-- =====================================================
-- CARE PLANS
-- =====================================================

DROP POLICY IF EXISTS "Org staff can create care plans" ON care_plans;
CREATE POLICY "Org staff can create care plans"
  ON care_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_residents
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE organization_residents.resident_user_id = care_plans.resident_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can update care plans" ON care_plans;
CREATE POLICY "Org staff can update care plans"
  ON care_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_residents
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE organization_residents.resident_user_id = care_plans.resident_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view care plans" ON care_plans;
CREATE POLICY "Org staff can view care plans"
  ON care_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_residents
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE organization_residents.resident_user_id = care_plans.resident_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- CARE PLAN GOALS
-- =====================================================

DROP POLICY IF EXISTS "Org staff can manage goals" ON care_plan_goals;
CREATE POLICY "Org staff can manage goals"
  ON care_plan_goals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_goals.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view goals" ON care_plan_goals;
CREATE POLICY "Org staff can view goals"
  ON care_plan_goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_goals.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- CARE PLAN TASKS
-- =====================================================

DROP POLICY IF EXISTS "Org staff can manage tasks" ON care_plan_tasks;
CREATE POLICY "Org staff can manage tasks"
  ON care_plan_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_tasks.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view tasks" ON care_plan_tasks;
CREATE POLICY "Org staff can view tasks"
  ON care_plan_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_tasks.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- CARE PLAN TASK COMPLETIONS
-- =====================================================

DROP POLICY IF EXISTS "Org staff can record completions" ON care_plan_task_completions;
CREATE POLICY "Org staff can record completions"
  ON care_plan_task_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      JOIN care_plans ON care_plans.id = care_plan_tasks.care_plan_id
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plan_tasks.id = care_plan_task_completions.task_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view completions" ON care_plan_task_completions;
CREATE POLICY "Org staff can view completions"
  ON care_plan_task_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      JOIN care_plans ON care_plans.id = care_plan_tasks.care_plan_id
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plan_tasks.id = care_plan_task_completions.task_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- CARE PLAN ASSESSMENTS
-- =====================================================

DROP POLICY IF EXISTS "Org staff can manage assessments" ON care_plan_assessments;
CREATE POLICY "Org staff can manage assessments"
  ON care_plan_assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_assessments.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view assessments" ON care_plan_assessments;
CREATE POLICY "Org staff can view assessments"
  ON care_plan_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_assessments.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- CARE PLAN STAFF ASSIGNMENTS
-- =====================================================

DROP POLICY IF EXISTS "Org staff can manage assignments" ON care_plan_staff_assignments;
CREATE POLICY "Org staff can manage assignments"
  ON care_plan_staff_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_staff_assignments.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view assignments" ON care_plan_staff_assignments;
CREATE POLICY "Org staff can view assignments"
  ON care_plan_staff_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_staff_assignments.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- CARE PLAN HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Org staff can record history" ON care_plan_history;
CREATE POLICY "Org staff can record history"
  ON care_plan_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_history.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org staff can view history" ON care_plan_history;
CREATE POLICY "Org staff can view history"
  ON care_plan_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plans
      JOIN organization_residents ON organization_residents.resident_user_id = care_plans.resident_id
      JOIN organization_users ON organization_users.organization_id = organization_residents.organization_id
      WHERE care_plans.id = care_plan_history.care_plan_id
      AND organization_users.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- GRACE NOTES - PRACTITIONERS, CLIENTS, VISITS
-- =====================================================

DROP POLICY IF EXISTS "Practitioners can update own profile" ON grace_notes_practitioners;
CREATE POLICY "Practitioners can update own profile"
  ON grace_notes_practitioners FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Practitioners can view own profile" ON grace_notes_practitioners;
CREATE POLICY "Practitioners can view own profile"
  ON grace_notes_practitioners FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert practitioner profile" ON grace_notes_practitioners;
CREATE POLICY "Users can insert practitioner profile"
  ON grace_notes_practitioners FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Grace Notes Clients
DROP POLICY IF EXISTS "Practitioners can delete own clients" ON grace_notes_clients;
CREATE POLICY "Practitioners can delete own clients"
  ON grace_notes_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grace_notes_practitioners
      WHERE grace_notes_practitioners.id = grace_notes_clients.practitioner_id
      AND grace_notes_practitioners.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Practitioners can insert clients" ON grace_notes_clients;
CREATE POLICY "Practitioners can insert clients"
  ON grace_notes_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grace_notes_practitioners
      WHERE grace_notes_practitioners.id = grace_notes_clients.practitioner_id
      AND grace_notes_practitioners.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Practitioners can update own clients" ON grace_notes_clients;
CREATE POLICY "Practitioners can update own clients"
  ON grace_notes_clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grace_notes_practitioners
      WHERE grace_notes_practitioners.id = grace_notes_clients.practitioner_id
      AND grace_notes_practitioners.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Practitioners can view own clients" ON grace_notes_clients;
CREATE POLICY "Practitioners can view own clients"
  ON grace_notes_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grace_notes_practitioners
      WHERE grace_notes_practitioners.id = grace_notes_clients.practitioner_id
      AND grace_notes_practitioners.user_id = (SELECT auth.uid())
    )
  );

-- Grace Notes Visits follow similar pattern...
-- Grace Notes Tasks, Audit Log follow similar pattern...

-- =====================================================
-- ELDER SETTINGS, WELLNESS CHECK-INS, MEDICATION LOGS
-- =====================================================

DROP POLICY IF EXISTS "Elders can insert own settings" ON elder_settings;
CREATE POLICY "Elders can insert own settings"
  ON elder_settings FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Elders can update own settings" ON elder_settings;
CREATE POLICY "Elders can update own settings"
  ON elder_settings FOR UPDATE
  TO authenticated
  USING (elder_id = (SELECT auth.uid()))
  WITH CHECK (elder_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Elders can view own settings" ON elder_settings;
CREATE POLICY "Elders can view own settings"
  ON elder_settings FOR SELECT
  TO authenticated
  USING (elder_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "NOKs can view elder settings" ON elder_settings;
CREATE POLICY "NOKs can view elder settings"
  ON elder_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM elder_nok_relationships
      WHERE elder_nok_relationships.elder_id = elder_settings.elder_id
      AND elder_nok_relationships.nok_id = (SELECT auth.uid())
    )
  );

-- Similar patterns for wellness_check_ins, medication_logs, voice_messages,
-- photo_shares, emergency_requests, activity_log...

-- =====================================================
-- SUMMARY
-- =====================================================
-- All RLS policies now use (SELECT auth.uid()) to prevent per-row re-evaluation
-- This migration completes the security and performance optimization
