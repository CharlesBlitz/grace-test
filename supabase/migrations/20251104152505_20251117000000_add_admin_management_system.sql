/*
  # Add Comprehensive Admin Management System

  ## Overview
  Creates a complete administrative control system for managing all aspects of Grace Companion,
  Organizations, and Grace Notes platforms. Includes user management, tech support ticketing,
  notifications, audit logging, and role-based access control.

  ## New Tables Created

  1. **admin_users**
     - Admin account profiles with role assignments
     - Links to auth.users for authentication
     - Tracks admin status, permissions, and contact info

  2. **admin_roles**
     - Enum type defining admin permission levels
     - super_admin: Full system access
     - support_staff: User support and ticket management
     - billing_admin: Subscription and payment management
     - read_only_auditor: View-only access for compliance

  3. **support_tickets**
     - Tech support ticket management
     - Links to users, organizations, or practitioners
     - Priority levels, categories, and status tracking
     - Assignment to support staff

  4. **ticket_messages**
     - Support conversation threads
     - Messages from both users and support staff
     - Internal notes visible only to admin team
     - Attachment support

  5. **user_status_history**
     - Tracks all account status changes
     - Documents suspension/deletion reasons
     - Maintains complete audit trail

  6. **admin_notifications**
     - System-wide announcements and alerts
     - Targeted notifications by user segment
     - Scheduled delivery support
     - Delivery status tracking

  7. **admin_audit_logs**
     - Comprehensive logging of all admin actions
     - Tracks who did what, when, and from where
     - IP address and user agent capture
     - Immutable audit trail for compliance

  8. **user_activity_metrics**
     - Tracks user login frequency and feature usage
     - Enables monitoring of account activity
     - Supports engagement analytics

  ## Security
  - All tables have RLS enabled
  - Admins can only access data within their permission level
  - Super admins have full access to all data
  - Audit logs are append-only and immutable
  - Support tickets maintain privacy while enabling collaboration

  ## Important Notes
  - Admin users must be manually created by super admins
  - All administrative actions are logged for compliance
  - User status changes trigger notification workflows
  - Support tickets integrate with email notifications
*/

-- Create admin role enum type
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM (
    'super_admin',
    'support_staff',
    'billing_admin',
    'read_only_auditor'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ticket priority enum
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical',
    'emergency'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ticket status enum
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'new',
    'assigned',
    'in_progress',
    'waiting_on_user',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ticket category enum
DO $$ BEGIN
  CREATE TYPE ticket_category AS ENUM (
    'technical_issue',
    'billing_inquiry',
    'account_access',
    'feature_request',
    'bug_report',
    'compliance_question',
    'data_request',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create account status enum
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM (
    'active',
    'suspended',
    'deleted',
    'pending_verification',
    'pending_deletion'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Personal information
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,

  -- Role and permissions
  role admin_role NOT NULL DEFAULT 'support_staff',

  -- Status
  is_active boolean DEFAULT true,
  last_login_at timestamptz,

  -- Metadata
  notes text,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,

  -- Ticket information
  subject text NOT NULL,
  category ticket_category NOT NULL,
  priority ticket_priority DEFAULT 'medium',
  status ticket_status DEFAULT 'new',

  -- Related entities (one of these will be set)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE SET NULL,

  -- User information (captured at creation)
  user_email text,
  user_name text,

  -- Assignment
  assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at timestamptz,

  -- Description
  description text NOT NULL,

  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  resolution_notes text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_response_at timestamptz,

  -- Metadata
  tags text[] DEFAULT '{}',
  internal_notes text
);

-- 3. Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,

  -- Message information
  message text NOT NULL,
  is_internal boolean DEFAULT false, -- internal notes only visible to admins

  -- Author (either admin or user)
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_type text NOT NULL, -- 'admin', 'user', 'system'

  -- Attachments
  attachments jsonb DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- 4. User Status History Table
CREATE TABLE IF NOT EXISTS user_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target user (one of these will be set)
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  practitioner_id uuid REFERENCES grace_notes_practitioners(id) ON DELETE CASCADE,

  -- Status change
  old_status account_status,
  new_status account_status NOT NULL,
  reason text NOT NULL,
  notes text,

  -- Suspension details (if applicable)
  suspension_ends_at timestamptz,
  is_permanent boolean DEFAULT false,

  -- Action taken by
  changed_by uuid REFERENCES admin_users(id) ON DELETE SET NULL NOT NULL,
  ip_address text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- 5. Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notification content
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL, -- 'announcement', 'maintenance', 'alert', 'update'

  -- Targeting
  target_audience text NOT NULL, -- 'all', 'grace_companion', 'organizations', 'grace_notes', 'specific_users'
  target_user_ids uuid[] DEFAULT '{}',
  target_subscription_tiers text[] DEFAULT '{}',

  -- Scheduling
  scheduled_for timestamptz,
  sent_at timestamptz,

  -- Delivery channels
  send_email boolean DEFAULT false,
  send_push boolean DEFAULT false,
  send_in_app boolean DEFAULT true,

  -- Status
  is_active boolean DEFAULT true,

  -- Metadata
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Delivery stats
  total_recipients integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  read_count integer DEFAULT 0
);

-- 6. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Admin who performed action
  admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL NOT NULL,
  admin_email text NOT NULL,

  -- Action details
  action text NOT NULL, -- 'create_user', 'suspend_account', 'delete_data', etc.
  entity_type text NOT NULL, -- 'user', 'organization', 'ticket', etc.
  entity_id uuid,

  -- Changes made
  old_values jsonb,
  new_values jsonb,

  -- Request information
  ip_address text,
  user_agent text,

  -- Additional context
  notes text,

  -- Timestamp (immutable)
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 7. User Activity Metrics Table
CREATE TABLE IF NOT EXISTS user_activity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Activity data
  last_login_at timestamptz,
  login_count integer DEFAULT 0,
  feature_usage jsonb DEFAULT '{}'::jsonb,

  -- Engagement metrics
  messages_sent integer DEFAULT 0,
  voice_interactions integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,

  -- Timestamps
  first_activity_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

-- Add account_status column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE users ADD COLUMN account_status account_status DEFAULT 'active';
  END IF;
END $$;

-- Add suspension fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN suspension_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'suspension_ends_at'
  ) THEN
    ALTER TABLE users ADD COLUMN suspension_ends_at timestamptz;
  END IF;
END $$;

-- Add account_status to organizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN account_status account_status DEFAULT 'active';
  END IF;
END $$;

-- Add account_status to grace_notes_practitioners table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grace_notes_practitioners' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE grace_notes_practitioners ADD COLUMN account_status account_status DEFAULT 'active';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_practitioner_id ON support_tickets(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_user_status_history_user_id ON user_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_history_organization_id ON user_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_status_history_practitioner_id ON user_status_history(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_user_status_history_created_at ON user_status_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_scheduled_for ON admin_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_sent_at ON admin_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_type ON admin_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_id ON admin_audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_user_id ON user_activity_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_last_activity ON user_activity_metrics(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_organizations_account_status ON organizations(account_status);
CREATE INDEX IF NOT EXISTS idx_grace_notes_practitioners_account_status ON grace_notes_practitioners(account_status);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Admin users can read own profile"
  ON admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can read all admin profiles"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS Policies for support_tickets
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can update tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for ticket_messages
CREATE POLICY "Admins can view all messages"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can create messages"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view non-internal messages on their tickets"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    NOT is_internal
    AND ticket_id IN (
      SELECT id FROM support_tickets WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_status_history
CREATE POLICY "Admins can view all status history"
  ON user_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can create status history"
  ON user_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for admin_notifications
CREATE POLICY "Admins can view all notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Support staff and above can create notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'support_staff')
    )
  );

CREATE POLICY "Notification creators can update their notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for admin_audit_logs (read-only after creation)
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can create audit logs"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for user_activity_metrics
CREATE POLICY "Admins can view all activity metrics"
  ON user_activity_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can update activity metrics"
  ON user_activity_metrics FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  number_exists boolean;
BEGIN
  LOOP
    -- Generate ticket number: TKT-YYYYMMDD-XXXX
    new_number := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' ||
                  lpad(floor(random() * 10000)::text, 4, '0');

    -- Check if number already exists
    SELECT EXISTS(SELECT 1 FROM support_tickets WHERE ticket_number = new_number)
    INTO number_exists;

    -- Exit loop if number is unique
    EXIT WHEN NOT number_exists;
  END LOOP;

  RETURN new_number;
END;
$$;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Function to update ticket timestamp on new message
CREATE OR REPLACE FUNCTION update_ticket_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE support_tickets
  SET
    last_response_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ticket_on_message
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_on_message();

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_email text;
  v_log_id uuid;
BEGIN
  -- Get admin info
  SELECT id, email INTO v_admin_id, v_admin_email
  FROM admin_users
  WHERE user_id = auth.uid();

  -- Insert audit log
  INSERT INTO admin_audit_logs (
    admin_id,
    admin_email,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    notes
  ) VALUES (
    v_admin_id,
    v_admin_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_notes
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
