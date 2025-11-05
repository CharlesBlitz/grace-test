/*
  # Push Notification System

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `endpoint` (text, push endpoint URL)
      - `p256dh_key` (text, encryption key)
      - `auth_key` (text, authentication key)
      - `device_info` (jsonb, browser/device details)
      - `is_active` (boolean, subscription active status)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_used_at` (timestamptz)

    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users, unique)
      - `medication_reminders` (boolean, default true)
      - `wellness_checkins` (boolean, default true)
      - `family_messages` (boolean, default true)
      - `emergency_alerts` (boolean, default true)
      - `incident_alerts` (boolean, default true)
      - `quiet_hours_enabled` (boolean, default false)
      - `quiet_hours_start` (time, default '22:00')
      - `quiet_hours_end` (time, default '08:00')
      - `vibration_enabled` (boolean, default true)
      - `vibration_intensity` (text, default 'medium')
      - `notification_sound` (text, default 'default')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `notification_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `notification_type` (text, medication|wellness|message|emergency|incident)
      - `title` (text)
      - `body` (text)
      - `sent_at` (timestamptz)
      - `delivered_at` (timestamptz, nullable)
      - `opened_at` (timestamptz, nullable)
      - `dismissed_at` (timestamptz, nullable)
      - `action_taken` (text, nullable)
      - `action_taken_at` (timestamptz, nullable)
      - `metadata` (jsonb, additional context)
      - `subscription_id` (uuid, references push_subscriptions)
      - `created_at` (timestamptz)

    - `scheduled_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `notification_type` (text)
      - `title` (text)
      - `body` (text)
      - `scheduled_for` (timestamptz)
      - `sent_at` (timestamptz, nullable)
      - `is_recurring` (boolean, default false)
      - `recurrence_pattern` (text, nullable - daily|weekly|custom)
      - `recurrence_data` (jsonb, nullable)
      - `metadata` (jsonb)
      - `is_cancelled` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own subscriptions
    - Add policies for notification delivery and logging

  3. Important Notes
    - Push subscriptions store Web Push API credentials securely
    - Notification preferences control when and how notifications are sent
    - Notification log provides complete audit trail for compliance
    - Scheduled notifications enable medication reminders and wellness check-ins
*/

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  medication_reminders boolean DEFAULT true,
  wellness_checkins boolean DEFAULT true,
  family_messages boolean DEFAULT true,
  emergency_alerts boolean DEFAULT true,
  incident_alerts boolean DEFAULT true,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '08:00',
  vibration_enabled boolean DEFAULT true,
  vibration_intensity text DEFAULT 'medium' CHECK (vibration_intensity IN ('gentle', 'medium', 'strong')),
  notification_sound text DEFAULT 'default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('medication', 'wellness', 'message', 'emergency', 'incident', 'conversation')),
  title text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  dismissed_at timestamptz,
  action_taken text,
  action_taken_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  subscription_id uuid REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for analytics and queries
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC);

-- Create scheduled_notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('medication', 'wellness', 'message', 'reminder', 'checkin')),
  title text NOT NULL,
  body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text CHECK (recurrence_pattern IN ('daily', 'weekly', 'custom') OR recurrence_pattern IS NULL),
  recurrence_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_cancelled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient scheduling
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for) WHERE sent_at IS NULL AND is_cancelled = false;
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON scheduled_notifications(scheduled_for, is_cancelled, sent_at);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notification_log
CREATE POLICY "Users can view own notification log"
  ON notification_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification log"
  ON notification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update notification log"
  ON notification_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for scheduled_notifications
CREATE POLICY "Users can view own scheduled notifications"
  ON scheduled_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled notifications"
  ON scheduled_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled notifications"
  ON scheduled_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled notifications"
  ON scheduled_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default notification preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_notification_preferences_trigger'
  ) THEN
    CREATE TRIGGER create_notification_preferences_trigger
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_default_notification_preferences();
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_push_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_push_subscriptions_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_notification_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_notification_preferences_updated_at
      BEFORE UPDATE ON notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_notification_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_scheduled_notifications_updated_at'
  ) THEN
    CREATE TRIGGER update_scheduled_notifications_updated_at
      BEFORE UPDATE ON scheduled_notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_notification_updated_at();
  END IF;
END $$;

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences WHERE notification_preferences.user_id = users.id
);
