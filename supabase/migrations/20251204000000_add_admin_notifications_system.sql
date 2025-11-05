/*
  # Admin Notifications System

  1. New Tables
    - `admin_notifications`
      - `id` (uuid, primary key)
      - `title` (text, notification title)
      - `message` (text, notification body)
      - `notification_type` (text, type of notification: announcement, alert, update, maintenance)
      - `priority` (text, priority level: low, medium, high, urgent)
      - `target_audience` (text, who receives it: all, grace_companion, organizations, grace_notes)
      - `target_filters` (jsonb, additional targeting filters like organization_id, user_role, etc.)
      - `scheduled_for` (timestamptz, when to send, null for immediate)
      - `sent_at` (timestamptz, when it was sent)
      - `sent_count` (integer, number of users it was sent to)
      - `created_by` (uuid, references admin_users)
      - `status` (text, draft, scheduled, sent, cancelled)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `admin_notification_recipients`
      - `id` (uuid, primary key)
      - `notification_id` (uuid, references admin_notifications)
      - `user_id` (uuid, references users)
      - `delivered_at` (timestamptz, nullable)
      - `read_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Only admin users can create and manage notifications
    - Regular users can only read their received notifications

  3. Important Notes
    - Admin notifications are broadcast announcements sent to multiple users
    - Supports targeting by platform, organization, or custom filters
    - Tracks delivery and read status for each recipient
    - Supports immediate or scheduled sending
*/

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('announcement', 'alert', 'update', 'maintenance', 'feature')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  target_audience text NOT NULL CHECK (target_audience IN ('all', 'grace_companion', 'organizations', 'grace_notes', 'custom')),
  target_filters jsonb DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_count integer DEFAULT 0,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_notification_recipients table
CREATE TABLE IF NOT EXISTS admin_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES admin_notifications(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_scheduled ON admin_notifications(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_by ON admin_notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_notification ON admin_notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_user ON admin_notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_unread ON admin_notification_recipients(user_id, read_at) WHERE read_at IS NULL;

-- Enable Row Level Security
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_notifications
CREATE POLICY "Admin users can view all notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admin users can create notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admin users can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admin users can delete notifications"
  ON admin_notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- RLS Policies for admin_notification_recipients
CREATE POLICY "Users can view their own notification receipts"
  ON admin_notification_recipients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin users can view all notification receipts"
  ON admin_notification_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "System can insert notification receipts"
  ON admin_notification_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notification receipts"
  ON admin_notification_recipients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_notifications_updated_at'
  ) THEN
    CREATE TRIGGER update_admin_notifications_updated_at
      BEFORE UPDATE ON admin_notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_admin_notification_updated_at();
  END IF;
END $$;
