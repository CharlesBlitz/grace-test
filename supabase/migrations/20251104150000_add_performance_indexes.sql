/*
  # Performance Optimization Indexes

  ## Summary
  Adds comprehensive indexes to improve query performance across the application.
  These indexes target frequently queried columns and foreign key relationships.

  ## New Indexes

  ### Users Table
  - email lookups (login, registration)
  - role-based queries (staff, elders, family)
  - organization membership lookups
  - created_at for temporal queries

  ### Organizations Table
  - type-based queries
  - active organization filters
  - subscription tier lookups

  ### Care Plans Table
  - resident lookups
  - status-based queries
  - date range queries
  - organization filters

  ### Wellness Logs Table
  - user and date range queries
  - recent entries queries
  - metric type filters

  ### Reminders Table
  - user and due date queries
  - status-based queries
  - completed/pending filters

  ### Messages Table
  - sender/recipient queries
  - unread message counts
  - conversation threads

  ### Incidents Table
  - resident and date queries
  - severity-based queries
  - resolution status

  ### Notes
  - All indexes use IF NOT EXISTS to allow safe re-running
  - Composite indexes ordered for optimal query patterns
  - Partial indexes used where appropriate for status filters
*/

-- =====================================================
-- USERS TABLE INDEXES
-- =====================================================

-- Email lookup (login, registration)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role)
WHERE role IS NOT NULL;

-- Organization membership
CREATE INDEX IF NOT EXISTS idx_users_organization
ON users(organization_id)
WHERE organization_id IS NOT NULL;

-- Email verification status
CREATE INDEX IF NOT EXISTS idx_users_email_verified
ON users(email_verified)
WHERE email_verified = true;

-- Recent users (for admin dashboards)
CREATE INDEX IF NOT EXISTS idx_users_created_at
ON users(created_at DESC);

-- Active users composite
CREATE INDEX IF NOT EXISTS idx_users_active_org
ON users(organization_id, role, created_at DESC)
WHERE organization_id IS NOT NULL;

-- =====================================================
-- ORGANIZATIONS TABLE INDEXES
-- =====================================================

-- Organization type queries
CREATE INDEX IF NOT EXISTS idx_organizations_type
ON organizations(organization_type);

-- Active organizations
CREATE INDEX IF NOT EXISTS idx_organizations_active
ON organizations(is_active)
WHERE is_active = true;

-- Subscription tier
CREATE INDEX IF NOT EXISTS idx_organizations_subscription
ON organizations(subscription_tier);

-- Active orgs by type
CREATE INDEX IF NOT EXISTS idx_organizations_active_type
ON organizations(organization_type, is_active, created_at DESC)
WHERE is_active = true;

-- =====================================================
-- CARE PLANS TABLE INDEXES
-- =====================================================

-- Resident care plans lookup
CREATE INDEX IF NOT EXISTS idx_care_plans_resident
ON care_plans(resident_id);

-- Organization care plans
CREATE INDEX IF NOT EXISTS idx_care_plans_organization
ON care_plans(organization_id);

-- Active care plans
CREATE INDEX IF NOT EXISTS idx_care_plans_status
ON care_plans(status)
WHERE status IS NOT NULL;

-- Recent care plans
CREATE INDEX IF NOT EXISTS idx_care_plans_created_at
ON care_plans(created_at DESC);

-- Next review date (for reminders)
CREATE INDEX IF NOT EXISTS idx_care_plans_next_review
ON care_plans(next_review_date)
WHERE next_review_date IS NOT NULL;

-- Org + status composite
CREATE INDEX IF NOT EXISTS idx_care_plans_org_status
ON care_plans(organization_id, status, created_at DESC);

-- =====================================================
-- WELLNESS LOGS TABLE INDEXES
-- =====================================================

-- User wellness history
CREATE INDEX IF NOT EXISTS idx_wellness_logs_user
ON wellness_logs(user_id, recorded_at DESC);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_wellness_logs_date
ON wellness_logs(recorded_at DESC);

-- Metric type queries
CREATE INDEX IF NOT EXISTS idx_wellness_logs_metric
ON wellness_logs(metric_type)
WHERE metric_type IS NOT NULL;

-- Recent logs per user
CREATE INDEX IF NOT EXISTS idx_wellness_logs_user_metric
ON wellness_logs(user_id, metric_type, recorded_at DESC);

-- =====================================================
-- REMINDERS TABLE INDEXES
-- =====================================================

-- User reminders
CREATE INDEX IF NOT EXISTS idx_reminders_user
ON reminders(user_id, due_date DESC);

-- Due reminders (for scheduling)
CREATE INDEX IF NOT EXISTS idx_reminders_due_date
ON reminders(due_date)
WHERE status = 'pending';

-- Status-based queries
CREATE INDEX IF NOT EXISTS idx_reminders_status
ON reminders(status, due_date DESC);

-- Pending reminders per user
CREATE INDEX IF NOT EXISTS idx_reminders_user_pending
ON reminders(user_id, due_date)
WHERE status = 'pending';

-- Reminder type
CREATE INDEX IF NOT EXISTS idx_reminders_type
ON reminders(reminder_type)
WHERE reminder_type IS NOT NULL;

-- =====================================================
-- MESSAGES TABLE INDEXES
-- =====================================================

-- Sender messages
CREATE INDEX IF NOT EXISTS idx_messages_sender
ON messages(sender_id, created_at DESC);

-- Recipient messages
CREATE INDEX IF NOT EXISTS idx_messages_recipient
ON messages(recipient_id, created_at DESC);

-- Unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages(recipient_id, read_at)
WHERE read_at IS NULL;

-- Conversation threads
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(sender_id, recipient_id, created_at DESC);

-- =====================================================
-- INCIDENTS TABLE INDEXES
-- =====================================================

-- Resident incidents
CREATE INDEX IF NOT EXISTS idx_incidents_resident
ON incidents(resident_id, occurred_at DESC);

-- Organization incidents
CREATE INDEX IF NOT EXISTS idx_incidents_organization
ON incidents(organization_id, occurred_at DESC);

-- Severity-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_severity
ON incidents(severity, occurred_at DESC);

-- Unresolved incidents
CREATE INDEX IF NOT EXISTS idx_incidents_resolved
ON incidents(resolved_at)
WHERE resolved_at IS NULL;

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at
ON incidents(occurred_at DESC);

-- Critical incidents per org
CREATE INDEX IF NOT EXISTS idx_incidents_org_critical
ON incidents(organization_id, severity, occurred_at DESC)
WHERE severity IN ('critical', 'high');

-- =====================================================
-- SIGNATURES TABLE INDEXES
-- =====================================================

-- User signatures
CREATE INDEX IF NOT EXISTS idx_signatures_user
ON signatures(user_id, signed_at DESC);

-- Document signatures
CREATE INDEX IF NOT EXISTS idx_signatures_document
ON signatures(document_id)
WHERE document_id IS NOT NULL;

-- Signature type
CREATE INDEX IF NOT EXISTS idx_signatures_type
ON signatures(signature_type);

-- =====================================================
-- NOTIFICATIONS TABLE INDEXES
-- =====================================================

-- User notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, created_at DESC);

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, read_at)
WHERE read_at IS NULL;

-- Notification type
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(notification_type, created_at DESC);

-- =====================================================
-- ERROR LOGS TABLE INDEXES
-- =====================================================

-- Recent errors
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at
ON error_logs(created_at DESC);

-- Severity-based queries
CREATE INDEX IF NOT EXISTS idx_error_logs_severity
ON error_logs(severity, created_at DESC);

-- User errors
CREATE INDEX IF NOT EXISTS idx_error_logs_user
ON error_logs(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Organization errors
CREATE INDEX IF NOT EXISTS idx_error_logs_organization
ON error_logs(organization_id, created_at DESC)
WHERE organization_id IS NOT NULL;

-- =====================================================
-- SYSTEM HEALTH CHECKS TABLE INDEXES
-- =====================================================

-- Recent health checks
CREATE INDEX IF NOT EXISTS idx_system_health_checks_date
ON system_health_checks(checked_at DESC);

-- Service health history
CREATE INDEX IF NOT EXISTS idx_system_health_checks_service
ON system_health_checks(check_type, checked_at DESC);

-- Failed health checks
CREATE INDEX IF NOT EXISTS idx_system_health_checks_failed
ON system_health_checks(check_type, status, checked_at DESC)
WHERE status != 'healthy';

-- =====================================================
-- MCA/DoLS TABLES INDEXES
-- =====================================================

-- MCA assessments by resident
CREATE INDEX IF NOT EXISTS idx_mca_assessments_resident
ON mca_assessments(resident_id, assessment_date DESC);

-- DoLS applications by resident
CREATE INDEX IF NOT EXISTS idx_dols_applications_resident
ON dols_applications(resident_id, application_date DESC);

-- Active DoLS
CREATE INDEX IF NOT EXISTS idx_dols_applications_active
ON dols_applications(status, expiry_date)
WHERE status = 'active';

-- =====================================================
-- SUBSCRIPTION TABLES INDEXES
-- =====================================================

-- Active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user
ON subscriptions(user_id, status);

-- Organization subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization
ON subscriptions(organization_id, status)
WHERE organization_id IS NOT NULL;

-- Trial expiring soon
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ending
ON subscriptions(trial_end_date)
WHERE status = 'trialing' AND trial_end_date IS NOT NULL;

-- =====================================================
-- ANALYTICS & REPORTING INDEXES
-- =====================================================

-- Interaction logs for analytics
CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_date
ON interaction_logs(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Documentation access logs
CREATE INDEX IF NOT EXISTS idx_documentation_access_logs_user
ON documentation_access_logs(user_id, accessed_at DESC);

-- Export logs
CREATE INDEX IF NOT EXISTS idx_export_logs_organization
ON export_logs(organization_id, exported_at DESC)
WHERE organization_id IS NOT NULL;

-- =====================================================
-- VERIFY INDEXES CREATED
-- =====================================================

-- Query to verify indexes exist
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
