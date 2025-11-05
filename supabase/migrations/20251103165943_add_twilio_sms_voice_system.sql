/*
  # Twilio SMS and Voice Communication System

  1. New Tables
    - `sms_logs` - Complete log of all SMS messages sent/received
      - `id` (uuid, primary key)
      - `direction` (text) - 'outbound' or 'inbound'
      - `from_number` (text) - Sender phone number
      - `to_number` (text) - Recipient phone number
      - `message_body` (text) - SMS content
      - `message_type` (text) - Category: 'reminder', 'alert', 'wellness', 'family_message', 'escalation', 'incident'
      - `status` (text) - 'queued', 'sent', 'delivered', 'failed', 'received'
      - `twilio_sid` (text) - Twilio message SID
      - `error_code` (text) - Error code if failed
      - `error_message` (text) - Error details
      - `user_id` (uuid) - Related user
      - `organization_id` (uuid) - Related organization
      - `metadata` (jsonb) - Additional context
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `voice_call_logs` - Complete log of all voice calls
      - `id` (uuid, primary key)
      - `direction` (text) - 'outbound' or 'inbound'
      - `from_number` (text)
      - `to_number` (text)
      - `call_type` (text) - 'reminder', 'alert', 'wellness_check', 'emergency'
      - `message_content` (text) - What was said
      - `duration` (integer) - Call duration in seconds
      - `status` (text) - 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'
      - `twilio_sid` (text)
      - `recording_url` (text) - URL to call recording if available
      - `used_cloned_voice` (boolean)
      - `voice_profile_id` (uuid)
      - `user_id` (uuid)
      - `organization_id` (uuid)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `sms_templates` - Reusable SMS templates
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `template_key` (text) - Unique identifier
      - `message_template` (text) - Template with variables
      - `category` (text) - Template category
      - `variables` (jsonb) - Required variables
      - `organization_id` (uuid) - Null for system templates
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `communication_preferences` - User SMS/voice preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User this applies to
      - `sms_enabled` (boolean)
      - `voice_enabled` (boolean)
      - `preferred_method` (text) - 'sms', 'voice', 'both'
      - `quiet_hours_start` (time)
      - `quiet_hours_end` (time)
      - `emergency_override` (boolean) - Allow messages during quiet hours for emergencies
      - `phone_number` (text)
      - `updated_at` (timestamptz)

    - `two_way_sms_conversations` - Track SMS conversations
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `phone_number` (text)
      - `last_message_at` (timestamptz)
      - `message_count` (integer)
      - `status` (text) - 'active', 'archived'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users and service role
    - Restrict access based on organization membership

  3. Indexes
    - Add indexes for phone numbers, statuses, and timestamps for efficient querying
*/

-- SMS Logs Table
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  message_body text NOT NULL,
  message_type text CHECK (message_type IN ('reminder', 'alert', 'wellness', 'family_message', 'escalation', 'incident', 'general')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received', 'undelivered')),
  twilio_sid text,
  error_code text,
  error_message text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_to_number ON sms_logs(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_twilio_sid ON sms_logs(twilio_sid);

-- Voice Call Logs Table
CREATE TABLE IF NOT EXISTS voice_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  call_type text CHECK (call_type IN ('reminder', 'alert', 'wellness_check', 'emergency', 'general')),
  message_content text,
  duration integer DEFAULT 0,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled')),
  twilio_sid text,
  recording_url text,
  used_cloned_voice boolean DEFAULT false,
  voice_profile_id uuid REFERENCES voice_profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_logs_user ON voice_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_org ON voice_call_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_to_number ON voice_call_logs(to_number);
CREATE INDEX IF NOT EXISTS idx_voice_logs_status ON voice_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_voice_logs_created ON voice_call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_logs_twilio_sid ON voice_call_logs(twilio_sid);

-- SMS Templates Table
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_key text NOT NULL,
  message_template text NOT NULL,
  category text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_templates_key ON sms_templates(template_key, organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_org ON sms_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);

-- Communication Preferences Table
CREATE TABLE IF NOT EXISTS communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sms_enabled boolean DEFAULT true,
  voice_enabled boolean DEFAULT true,
  preferred_method text DEFAULT 'sms' CHECK (preferred_method IN ('sms', 'voice', 'both')),
  quiet_hours_start time,
  quiet_hours_end time,
  emergency_override boolean DEFAULT true,
  phone_number text,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_prefs_user ON communication_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_prefs_phone ON communication_preferences(phone_number);

-- Two-way SMS Conversations Table
CREATE TABLE IF NOT EXISTS two_way_sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  message_count integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_conv_user ON two_way_sms_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_conv_phone ON two_way_sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_conv_status ON two_way_sms_conversations(status);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_way_sms_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_logs
CREATE POLICY "Users can view own SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view org SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = sms_logs.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('organization_admin', 'facility_director')
      AND organization_users.is_active = true
    )
  );

CREATE POLICY "Service role full access to SMS logs"
  ON sms_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for voice_call_logs
CREATE POLICY "Users can view own call logs"
  ON voice_call_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view org call logs"
  ON voice_call_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = voice_call_logs.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('organization_admin', 'facility_director')
      AND organization_users.is_active = true
    )
  );

CREATE POLICY "Service role full access to call logs"
  ON voice_call_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for sms_templates
CREATE POLICY "Users can view system templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (organization_id IS NULL);

CREATE POLICY "Organization members can view org templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = sms_templates.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.is_active = true
    )
  );

CREATE POLICY "Organization admins can manage org templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = sms_templates.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('organization_admin', 'facility_director')
      AND organization_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = sms_templates.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('organization_admin', 'facility_director')
      AND organization_users.is_active = true
    )
  );

CREATE POLICY "Service role full access to templates"
  ON sms_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for communication_preferences
CREATE POLICY "Users can view own communication preferences"
  ON communication_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own communication preferences"
  ON communication_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own communication preferences"
  ON communication_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization admins can view member preferences"
  ON communication_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou1
      JOIN organization_users ou2 ON ou1.organization_id = ou2.organization_id
      WHERE ou1.user_id = communication_preferences.user_id
      AND ou2.user_id = auth.uid()
      AND ou2.role IN ('organization_admin', 'facility_director')
      AND ou2.is_active = true
    )
  );

CREATE POLICY "Service role full access to preferences"
  ON communication_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for two_way_sms_conversations
CREATE POLICY "Users can view own conversations"
  ON two_way_sms_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to conversations"
  ON two_way_sms_conversations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert system SMS templates
INSERT INTO sms_templates (name, template_key, message_template, category, variables, organization_id, is_active)
VALUES
  ('Medication Reminder', 'medication_reminder', 'Hi {{name}}, time to take your {{medication}}. - Grace Companion', 'reminder', '["name", "medication"]'::jsonb, NULL, true),
  ('Appointment Reminder', 'appointment_reminder', 'Hi {{name}}, you have an appointment for {{appointment}} at {{time}}. - Grace Companion', 'reminder', '["name", "appointment", "time"]'::jsonb, NULL, true),
  ('Wellness Check', 'wellness_check', 'Hi {{name}}, how are you feeling today? Please respond. - Grace Companion', 'wellness', '["name"]'::jsonb, NULL, true),
  ('Emergency Alert', 'emergency_alert', 'URGENT: {{name}} needs immediate attention. {{reason}}. - Grace Companion', 'alert', '["name", "reason"]'::jsonb, NULL, true),
  ('Family Update', 'family_update', 'Update for {{resident}}: {{message}}. - Grace Companion', 'family_message', '["resident", "message"]'::jsonb, NULL, true),
  ('Task Reminder', 'task_reminder', 'Hi {{name}}, reminder: {{task}}. - Grace Companion', 'reminder', '["name", "task"]'::jsonb, NULL, true),
  ('Escalation Alert', 'escalation_alert', 'ALERT: {{name}} has missed {{count}} reminders for "{{task}}". Please check on them. - Grace Companion', 'escalation', '["name", "count", "task"]'::jsonb, NULL, true),
  ('Incident Alert', 'incident_alert', 'INCIDENT ALERT: {{severity}} severity incident detected for {{name}}. {{details}}. - Grace Companion', 'incident', '["severity", "name", "details"]'::jsonb, NULL, true),
  ('Wellness Report', 'wellness_report', 'Weekly wellness summary for {{name}}: {{summary}}. - Grace Companion', 'wellness', '["name", "summary"]'::jsonb, NULL, true)
ON CONFLICT DO NOTHING;
