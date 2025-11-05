/*
  # Add Reminder Notifications and Escalation System

  ## Overview
  Extends the care system to support SMS/phone call reminders with automatic escalation
  to Next of Kin when reminders are missed. Includes tracking for notification delivery,
  voice preferences, and escalation policies.

  ## Changes Made

  1. **Extend care_tasks table**
     - `reminder_method` (text[]) - Array of delivery methods: sms, call, push, email
     - `reminder_times` (time[]) - Array of times when reminders should be sent
     - `last_reminder_sent_at` (timestamptz) - When last reminder was sent
     - `reminder_attempts` (integer) - Number of reminder attempts made today
     - `escalation_threshold` (integer) - Number of missed attempts before escalating
     - `escalated_at` (timestamptz) - When escalation alert was sent
     - `use_cloned_voice` (boolean) - Whether to use family member's cloned voice
     - `voice_profile_id` (uuid) - Reference to voice profile to use
     
  2. **New Table: notification_log**
     - `id` (uuid, primary key) - Unique notification identifier
     - `task_id` (uuid, foreign key) - References care_tasks
     - `elder_id` (uuid, foreign key) - References users (elder)
     - `notification_type` (text) - Type: reminder, escalation, confirmation
     - `delivery_method` (text) - Method: sms, call, push, email
     - `recipient` (text) - Phone number or email address
     - `message_content` (text) - Content of notification
     - `status` (text) - Status: pending, sent, delivered, failed
     - `sent_at` (timestamptz) - When notification was sent
     - `delivered_at` (timestamptz) - When notification was delivered
     - `error_message` (text) - Error details if failed
     - `external_id` (text) - ID from external service (Twilio, etc.)
     - `created_at` (timestamptz) - When record was created

  3. **New Table: escalation_contacts**
     - `id` (uuid, primary key) - Unique contact identifier
     - `elder_id` (uuid, foreign key) - References users (elder)
     - `nok_id` (uuid, foreign key) - References users (NOK)
     - `contact_name` (text) - Name of contact person
     - `phone_number` (text) - Phone number for calls/SMS
     - `email` (text) - Email address
     - `priority_order` (integer) - Order in escalation chain (1 = first contact)
     - `notification_methods` (text[]) - Preferred methods for this contact
     - `active` (boolean) - Whether this contact is active
     - `created_at` (timestamptz) - When contact was added

  4. **New Table: reminder_schedule**
     - `id` (uuid, primary key) - Unique schedule identifier
     - `task_id` (uuid, foreign key) - References care_tasks
     - `day_of_week` (integer) - 0-6 (Sunday-Saturday), null for daily
     - `time_of_day` (time) - Time to send reminder
     - `active` (boolean) - Whether this schedule is active
     - `created_at` (timestamptz) - When schedule was created

  5. **Security**
     - Enable RLS on all new tables
     - Add policies for elder and NOK access
     - Ensure notification logs are accessible to authorized parties only

  ## Important Notes
  - Notification delivery requires Twilio credentials in environment variables
  - Voice cloning requires ElevenLabs API integration
  - Escalation chain follows priority_order ascending
  - Missed reminders reset counter at midnight or upon completion
*/

-- Add new columns to care_tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'reminder_method'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN reminder_method text[] DEFAULT '{sms,push}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'last_reminder_sent_at'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN last_reminder_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'reminder_attempts'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN reminder_attempts integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'escalation_threshold'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN escalation_threshold integer DEFAULT 3;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'escalated_at'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN escalated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'use_cloned_voice'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN use_cloned_voice boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'voice_profile_id'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN voice_profile_id uuid REFERENCES voice_profiles(id);
  END IF;
END $$;

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES care_tasks(id) ON DELETE CASCADE,
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('reminder', 'escalation', 'confirmation')),
  delivery_method text NOT NULL CHECK (delivery_method IN ('sms', 'call', 'push', 'email')),
  recipient text NOT NULL,
  message_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  external_id text,
  created_at timestamptz DEFAULT now()
);

-- Create escalation_contacts table
CREATE TABLE IF NOT EXISTS escalation_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nok_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  phone_number text,
  email text,
  priority_order integer NOT NULL DEFAULT 1,
  notification_methods text[] DEFAULT '{sms,call}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(elder_id, priority_order)
);

-- Create reminder_schedule table
CREATE TABLE IF NOT EXISTS reminder_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES care_tasks(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_of_day time NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_log

-- Elders can view their own notification logs
CREATE POLICY "Elders can view own notification logs"
  ON notification_log FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

-- NOKs can view notification logs for their elders
CREATE POLICY "NOKs can view elder notification logs"
  ON notification_log FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid()
    )
  );

-- System can insert notification logs
CREATE POLICY "System can insert notification logs"
  ON notification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for escalation_contacts

-- NOKs can manage escalation contacts for their elders
CREATE POLICY "NOKs can manage escalation contacts"
  ON escalation_contacts FOR ALL
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid() 
      AND can_modify_settings = true
    )
  );

-- Elders can view their escalation contacts
CREATE POLICY "Elders can view escalation contacts"
  ON escalation_contacts FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

-- RLS Policies for reminder_schedule

-- NOKs can manage reminder schedules for their elders
CREATE POLICY "NOKs can manage reminder schedules"
  ON reminder_schedule FOR ALL
  TO authenticated
  USING (
    task_id IN (
      SELECT id 
      FROM care_tasks 
      WHERE elder_id IN (
        SELECT elder_id 
        FROM elder_nok_relationships 
        WHERE nok_id = auth.uid() 
        AND can_modify_settings = true
      )
    )
  );

-- Elders can view their reminder schedules
CREATE POLICY "Elders can view reminder schedules"
  ON reminder_schedule FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id 
      FROM care_tasks 
      WHERE elder_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_log_elder_id ON notification_log(elder_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_task_id ON notification_log(task_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escalation_contacts_elder_id ON escalation_contacts(elder_id);
CREATE INDEX IF NOT EXISTS idx_escalation_contacts_priority ON escalation_contacts(elder_id, priority_order);

CREATE INDEX IF NOT EXISTS idx_reminder_schedule_task_id ON reminder_schedule(task_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedule_active ON reminder_schedule(active) WHERE active = true;

-- Add phone_number column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number text;
  END IF;
END $$;
