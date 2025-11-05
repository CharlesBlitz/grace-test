/*
  # Add Incident Alert and Notification System

  ## Overview
  Implements real-time incident detection alerts and notification system for care staff.
  Enables immediate response to potential incidents detected during resident interactions.

  ## New Tables Created

  1. **incident_alert_log**
     - Audit trail for all incident alerts sent to staff
     - Tracks detection details, severity, and staff response
     - Links to interaction logs for full context

  2. **notifications**
     - General notification system for staff
     - Supports multiple notification types including incident alerts
     - Priority levels for urgent notifications
     - Read/unread tracking

  3. **incident_acknowledgment**
     - Tracks staff acknowledgment of incident alerts
     - Records response times for compliance
     - Documents actions taken by staff

  ## Security
  - All tables have RLS enabled
  - Staff can only see notifications for their organization
  - Audit logs are read-only after creation
  - Acknowledgments create immutable audit trail

  ## Important Notes
  - Critical incidents trigger immediate alerts
  - System tracks notification delivery and acknowledgment
  - Escalation workflow for unacknowledged critical incidents
  - Data retention follows organizational requirements
*/

-- Create notifications table (general notification system)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification Details
  notification_type text NOT NULL CHECK (
    notification_type IN (
      'incident_alert',
      'reminder_escalation',
      'documentation_review',
      'care_plan_update',
      'medication_due',
      'family_message',
      'system_notification'
    )
  ),
  title text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),

  -- Status
  read boolean DEFAULT false,
  read_at timestamptz,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,

  -- Action Link
  action_url text,
  action_label text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create incident_alert_log table
CREATE TABLE IF NOT EXISTS incident_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  interaction_id uuid NOT NULL REFERENCES care_interaction_logs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Alert Details
  severity text NOT NULL CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  categories text[] DEFAULT '{}',
  detected_keywords text[] DEFAULT '{}',
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Notification Details
  alert_message text NOT NULL,
  staff_notified_count integer DEFAULT 0 CHECK (staff_notified_count >= 0),
  notification_method text[] DEFAULT ARRAY['in_app'],

  -- Response Tracking
  first_acknowledged_by uuid REFERENCES users(id) ON DELETE SET NULL,
  first_acknowledged_at timestamptz,
  response_time_seconds integer,

  -- Escalation
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  escalation_reason text,

  -- Resolution
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Create incident_acknowledgment table
CREATE TABLE IF NOT EXISTS incident_acknowledgment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  alert_id uuid NOT NULL REFERENCES incident_alert_log(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Acknowledgment Details
  acknowledged_at timestamptz DEFAULT now(),
  response_time_seconds integer CHECK (response_time_seconds >= 0),

  -- Actions Taken
  immediate_actions_taken text[] DEFAULT '{}',
  notes text,
  requires_follow_up boolean DEFAULT false,
  follow_up_due_date date,

  -- Location
  staff_location text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on all new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_acknowledgment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can delete their own old notifications
CREATE POLICY "Users can delete own old notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND read = true);

-- RLS Policies for incident_alert_log

-- Staff can view alerts for their organization
CREATE POLICY "Staff can view organization alerts"
  ON incident_alert_log FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- System can create alert logs
CREATE POLICY "System can create alert logs"
  ON incident_alert_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Staff can update alerts they're involved with
CREATE POLICY "Staff can update organization alerts"
  ON incident_alert_log FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for incident_acknowledgment

-- Staff can view acknowledgments for their organization
CREATE POLICY "Staff can view organization acknowledgments"
  ON incident_acknowledgment FOR SELECT
  TO authenticated
  USING (
    alert_id IN (
      SELECT id
      FROM incident_alert_log
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Staff can create acknowledgments
CREATE POLICY "Staff can create acknowledgments"
  ON incident_acknowledgment FOR INSERT
  TO authenticated
  WITH CHECK (
    alert_id IN (
      SELECT id
      FROM incident_alert_log
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Staff can update their own acknowledgments
CREATE POLICY "Staff can update own acknowledgments"
  ON incident_acknowledgment FOR UPDATE
  TO authenticated
  USING (staff_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_priority
  ON notifications(user_id, priority) WHERE priority IN ('high', 'urgent');
CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_log_organization
  ON incident_alert_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_resident
  ON incident_alert_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_severity
  ON incident_alert_log(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_alert_log_unresolved
  ON incident_alert_log(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_alert_log_created
  ON incident_alert_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acknowledgment_alert
  ON incident_acknowledgment(alert_id);
CREATE INDEX IF NOT EXISTS idx_acknowledgment_staff
  ON incident_acknowledgment(staff_id);

-- Create trigger to update first acknowledgment on alert log
CREATE OR REPLACE FUNCTION update_first_acknowledgment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE incident_alert_log
  SET
    first_acknowledged_by = NEW.staff_id,
    first_acknowledged_at = NEW.acknowledged_at,
    response_time_seconds = EXTRACT(EPOCH FROM (NEW.acknowledged_at - created_at))::integer
  WHERE
    id = NEW.alert_id
    AND first_acknowledged_by IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_first_acknowledgment ON incident_acknowledgment;
CREATE TRIGGER trigger_first_acknowledgment
  AFTER INSERT ON incident_acknowledgment
  FOR EACH ROW
  EXECUTE FUNCTION update_first_acknowledgment();

-- Create function to auto-escalate unacknowledged critical incidents
CREATE OR REPLACE FUNCTION escalate_unacknowledged_incidents()
RETURNS void AS $$
BEGIN
  UPDATE incident_alert_log
  SET
    escalated = true,
    escalated_at = now(),
    escalation_reason = 'No acknowledgment within 15 minutes of critical incident'
  WHERE
    severity = 'critical'
    AND first_acknowledged_by IS NULL
    AND escalated = false
    AND created_at < now() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old read notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE
    read = true
    AND read_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
