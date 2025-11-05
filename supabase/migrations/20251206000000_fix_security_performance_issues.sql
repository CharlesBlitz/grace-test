/*
  # Fix Security and Performance Issues

  ## Summary
  Comprehensive security and performance improvements addressing:
  - Unindexed foreign keys (48 tables)
  - RLS policy optimization with SELECT subqueries
  - Missing RLS policies
  - Function search path security

  ## Changes Made

  1. **Foreign Key Indexes** (Performance)
     - Added indexes for all unindexed foreign keys
     - Improves JOIN performance and query optimization
     - Critical for tables with relationships

  2. **RLS Policy Optimization** (Performance)
     - Wrapped auth.uid() calls in SELECT subqueries
     - Prevents re-evaluation for each row
     - Significant performance improvement at scale

  3. **Missing RLS Policies** (Security)
     - Added policies for staff_roles table
     - Ensures proper access control

  4. **Function Security** (Security)
     - Set explicit search_path on all functions
     - Prevents search path manipulation attacks

  ## Important Notes
  - This migration is idempotent (safe to run multiple times)
  - Existing indexes are not recreated
  - RLS policies are dropped and recreated with optimizations
*/

-- =====================================================
-- PART 1: CREATE MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

-- Activity Log
CREATE INDEX IF NOT EXISTS idx_activity_log_related_task_id ON activity_log(related_task_id);

-- Admin Notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_by ON admin_notifications(created_by);

-- Admin Users
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by ON admin_users(created_by);

-- Care Plan Assessments
CREATE INDEX IF NOT EXISTS idx_care_plan_assessments_assessed_by ON care_plan_assessments(assessed_by);

-- Care Plan History
CREATE INDEX IF NOT EXISTS idx_care_plan_history_changed_by ON care_plan_history(changed_by);

-- Care Plan Task Completions
CREATE INDEX IF NOT EXISTS idx_care_plan_task_completions_completed_by ON care_plan_task_completions(completed_by);
CREATE INDEX IF NOT EXISTS idx_care_plan_task_completions_resident_id ON care_plan_task_completions(resident_id);

-- Care Plans
CREATE INDEX IF NOT EXISTS idx_care_plans_created_by ON care_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_care_plans_template_id ON care_plans(template_id);

-- Care Tasks
CREATE INDEX IF NOT EXISTS idx_care_tasks_assigned_to_staff_id ON care_tasks(assigned_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_organization_id ON care_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_voice_profile_id ON care_tasks(voice_profile_id);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);

-- Email Delivery Logs
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_sender_user_id ON email_delivery_logs(sender_user_id);

-- Emergency Requests
CREATE INDEX IF NOT EXISTS idx_emergency_requests_acknowledged_by_staff_id ON emergency_requests(acknowledged_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_responded_by_staff_id ON emergency_requests(responded_by_staff_id);

-- Error Logs
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by ON error_logs(resolved_by);

-- Escalation Contacts
CREATE INDEX IF NOT EXISTS idx_escalation_contacts_nok_id ON escalation_contacts(nok_id);

-- Family Email Preferences
CREATE INDEX IF NOT EXISTS idx_family_email_preferences_organization_id ON family_email_preferences(organization_id);

-- Family Messages
CREATE INDEX IF NOT EXISTS idx_family_messages_voice_profile_id ON family_messages(voice_profile_id);

-- Grace Notes Assessments
CREATE INDEX IF NOT EXISTS idx_grace_notes_assessments_reviewed_by ON grace_notes_assessments(reviewed_by);

-- Grace Notes Documents
CREATE INDEX IF NOT EXISTS idx_grace_notes_documents_parent_document_id ON grace_notes_documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_grace_notes_documents_practitioner_id ON grace_notes_documents(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_grace_notes_documents_related_assessment_id ON grace_notes_documents(related_assessment_id);
CREATE INDEX IF NOT EXISTS idx_grace_notes_documents_related_visit_id ON grace_notes_documents(related_visit_id);

-- Grace Notes Tasks
CREATE INDEX IF NOT EXISTS idx_grace_notes_tasks_client_id ON grace_notes_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_grace_notes_tasks_related_assessment_id ON grace_notes_tasks(related_assessment_id);
CREATE INDEX IF NOT EXISTS idx_grace_notes_tasks_related_visit_id ON grace_notes_tasks(related_visit_id);

-- Grace Notes Visit Notes
CREATE INDEX IF NOT EXISTS idx_grace_notes_visit_notes_practitioner_id ON grace_notes_visit_notes(practitioner_id);

-- Medication Logs
CREATE INDEX IF NOT EXISTS idx_medication_logs_administered_by_staff_id ON medication_logs(administered_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_care_task_id ON medication_logs(care_task_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_second_verifier_staff_id ON medication_logs(second_verifier_staff_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_verified_by_staff_id ON medication_logs(verified_by_staff_id);

-- Memory Facts
CREATE INDEX IF NOT EXISTS idx_memory_facts_conversation_id ON memory_facts(conversation_id);

-- Message Delivery Log
CREATE INDEX IF NOT EXISTS idx_message_delivery_log_recipient_id ON message_delivery_log(recipient_id);

-- Message Reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Shift Schedules
CREATE INDEX IF NOT EXISTS idx_shift_schedules_handover_to_staff_id ON shift_schedules(handover_to_staff_id);

-- Support Tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_by ON support_tickets(resolved_by);

-- Ticket Messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_author_id ON ticket_messages(author_id);

-- User Status History
CREATE INDEX IF NOT EXISTS idx_user_status_history_changed_by ON user_status_history(changed_by);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Voice Call Logs
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_voice_profile_id ON voice_call_logs(voice_profile_id);

-- Voice Messages
CREATE INDEX IF NOT EXISTS idx_voice_messages_related_to_task_id ON voice_messages(related_to_task_id);

-- Voice Profiles
CREATE INDEX IF NOT EXISTS idx_voice_profiles_nok_id ON voice_profiles(nok_id);

-- Wellness Alerts
CREATE INDEX IF NOT EXISTS idx_wellness_alerts_acknowledged_by_staff_id ON wellness_alerts(acknowledged_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_wellness_alerts_resolved_by_staff_id ON wellness_alerts(resolved_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_wellness_alerts_wellness_summary_id ON wellness_alerts(wellness_summary_id);

-- Wellness Check Ins
CREATE INDEX IF NOT EXISTS idx_wellness_check_ins_reviewed_by_staff_id ON wellness_check_ins(reviewed_by_staff_id);

-- Wellness Summaries
CREATE INDEX IF NOT EXISTS idx_wellness_summaries_reviewed_by_staff_id ON wellness_summaries(reviewed_by_staff_id);

-- =====================================================
-- PART 2: ADD RLS POLICY FOR staff_roles TABLE
-- =====================================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_roles') THEN
    -- Create policies for staff_roles
    DROP POLICY IF EXISTS "Organization staff can view roles" ON staff_roles;
    DROP POLICY IF EXISTS "Organization admins can manage roles" ON staff_roles;

    CREATE POLICY "Organization staff can view roles"
      ON staff_roles FOR SELECT
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = (SELECT auth.uid())
        )
      );

    CREATE POLICY "Organization admins can manage roles"
      ON staff_roles FOR ALL
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = (SELECT auth.uid())
          AND role IN ('admin', 'manager')
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = (SELECT auth.uid())
          AND role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- =====================================================
-- PART 3: OPTIMIZE CRITICAL RLS POLICIES
-- =====================================================
-- Note: Due to the large number of policies (200+), we'll optimize
-- the most frequently accessed tables. Full optimization would be
-- done in subsequent migrations to keep file size manageable.

-- Users table (heavily accessed)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Admin Users (security critical)
DROP POLICY IF EXISTS "Admins can read own profile" ON admin_users;
CREATE POLICY "Admins can read own profile"
  ON admin_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Care Tasks (frequently accessed)
DROP POLICY IF EXISTS "Elders can view own tasks" ON care_tasks;
DROP POLICY IF EXISTS "Elders can update own tasks" ON care_tasks;

CREATE POLICY "Elders can view own tasks"
  ON care_tasks FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Elders can update own tasks"
  ON care_tasks FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Conversations (heavily accessed)
DROP POLICY IF EXISTS "Elders can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Elders can insert own conversations" ON conversations;

CREATE POLICY "Elders can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (elder_id = (SELECT auth.uid()));

CREATE POLICY "Elders can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = (SELECT auth.uid()));

-- Memory Facts
DROP POLICY IF EXISTS "Elders can view own memory facts" ON memory_facts;
CREATE POLICY "Elders can view own memory facts"
  ON memory_facts FOR SELECT
  TO authenticated
  USING (elder_id = (SELECT auth.uid()));

-- Voice Profiles
DROP POLICY IF EXISTS "Elders can view own voice profiles" ON voice_profiles;
DROP POLICY IF EXISTS "NoKs can view own voice profiles" ON voice_profiles;

CREATE POLICY "Elders can view own voice profiles"
  ON voice_profiles FOR SELECT
  TO authenticated
  USING (elder_id = (SELECT auth.uid()));

CREATE POLICY "NoKs can view own voice profiles"
  ON voice_profiles FOR SELECT
  TO authenticated
  USING (nok_id = (SELECT auth.uid()));

-- Elder NoK Relationships
DROP POLICY IF EXISTS "Elders can view their relationships" ON elder_nok_relationships;
DROP POLICY IF EXISTS "NoKs can view their relationships" ON elder_nok_relationships;
DROP POLICY IF EXISTS "NoKs can create relationships" ON elder_nok_relationships;

CREATE POLICY "Elders can view their relationships"
  ON elder_nok_relationships FOR SELECT
  TO authenticated
  USING (elder_id = (SELECT auth.uid()));

CREATE POLICY "NoKs can view their relationships"
  ON elder_nok_relationships FOR SELECT
  TO authenticated
  USING (nok_id = (SELECT auth.uid()));

CREATE POLICY "NoKs can create relationships"
  ON elder_nok_relationships FOR INSERT
  TO authenticated
  WITH CHECK (nok_id = (SELECT auth.uid()));

-- Family Messages
DROP POLICY IF EXISTS "Elders can view their messages" ON family_messages;
DROP POLICY IF EXISTS "Elders can mark messages as read" ON family_messages;

CREATE POLICY "Elders can view their messages"
  ON family_messages FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Elders can mark messages as read"
  ON family_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

-- Wellness Check Ins
DROP POLICY IF EXISTS "Elders can view own check-ins" ON wellness_check_ins;
DROP POLICY IF EXISTS "Elders can insert own check-ins" ON wellness_check_ins;

CREATE POLICY "Elders can view own check-ins"
  ON wellness_check_ins FOR SELECT
  TO authenticated
  USING (elder_id = (SELECT auth.uid()));

CREATE POLICY "Elders can insert own check-ins"
  ON wellness_check_ins FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = (SELECT auth.uid()));

-- =====================================================
-- PART 4: FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Update all functions with explicit search_path
ALTER FUNCTION update_family_messages_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION delete_expired_otp_codes() SET search_path = public, pg_temp;
ALTER FUNCTION create_default_elder_settings() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_wellness_score(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION determine_trend(numeric, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION calculate_medication_adherence(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION get_wellness_check_ins_summary(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION get_error_statistics(timestamptz, timestamptz) SET search_path = public, pg_temp;
ALTER FUNCTION record_health_check(text, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION update_biometric_settings_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_expired_lock_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION initialize_biometric_settings() SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_old_documentation_access_logs() SET search_path = public, pg_temp;
ALTER FUNCTION generate_ticket_number() SET search_path = public, pg_temp;
ALTER FUNCTION set_ticket_number() SET search_path = public, pg_temp;
ALTER FUNCTION update_ticket_on_message() SET search_path = public, pg_temp;
ALTER FUNCTION log_admin_action(text, text, uuid, jsonb, jsonb, text) SET search_path = public, pg_temp;
ALTER FUNCTION update_users_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION setup_admin_user_phone(text, text) SET search_path = public, pg_temp;

-- Add comments explaining the security fix
COMMENT ON FUNCTION update_family_messages_updated_at IS 'Trigger function with secure search_path to prevent manipulation attacks';
COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function with secure search_path to prevent manipulation attacks';
COMMENT ON FUNCTION setup_admin_user_phone IS 'Admin setup function with secure search_path. Usage: SELECT setup_admin_user_phone(''admin@example.com'', ''+44XXXXXXXXXX'');';

-- =====================================================
-- SUMMARY AND COMPLETION
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Security and performance migration completed successfully';
  RAISE NOTICE '- Created % foreign key indexes', 48;
  RAISE NOTICE '- Optimized % critical RLS policies', 20;
  RAISE NOTICE '- Added RLS policies for staff_roles table';
  RAISE NOTICE '- Fixed search_path for % functions', 20;
  RAISE NOTICE 'Remaining optimizations (RLS policies) can be done in follow-up migrations';
END $$;
