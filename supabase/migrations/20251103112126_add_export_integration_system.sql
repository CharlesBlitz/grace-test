/*
  # Stage 4: Export and Integration System

  1. New Tables
    - `integration_configurations` - Stores API credentials and settings for external integrations
    - `export_logs` - Audit trail for all data exports
    - `email_delivery_logs` - Tracks emails sent to families
    - `integration_sync_history` - Records all API synchronization events
    - `family_email_preferences` - Email consent and preferences for family members
    - `webhook_events` - Stores incoming webhook payloads for processing

  2. Security
    - Enable RLS on all tables
    - Add policies for organization staff to manage integrations
    - Add policies for audit log access
    - Ensure encrypted storage of API credentials

  3. Indexes
    - Optimize queries for export logs by organization and date
    - Index integration sync history for monitoring
    - Index email delivery logs for status tracking
*/

-- Integration Configurations Table
CREATE TABLE IF NOT EXISTS integration_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('person_centred_software', 'care_control')),
  is_enabled boolean DEFAULT false,
  api_endpoint text,
  api_credentials jsonb DEFAULT '{}',
  field_mappings jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  last_sync_status text CHECK (last_sync_status IN ('success', 'failed', 'never_synced')),
  sync_frequency text DEFAULT 'manual' CHECK (sync_frequency IN ('manual', 'hourly', 'daily', 'weekly')),
  webhook_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, integration_type)
);

-- Export Logs Table
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  export_type text NOT NULL CHECK (export_type IN ('pdf', 'csv')),
  data_type text NOT NULL CHECK (data_type IN ('care_plans', 'incidents', 'medications', 'daily_notes', 'assessments', 'interactions', 'all')),
  date_range_start date,
  date_range_end date,
  resident_ids jsonb DEFAULT '[]',
  filters_applied jsonb DEFAULT '{}',
  file_size_bytes bigint,
  record_count integer,
  export_status text DEFAULT 'pending' CHECK (export_status IN ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Email Delivery Logs Table
CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('daily_note', 'incident_report', 'weekly_summary', 'care_plan_update', 'assessment_result')),
  subject text NOT NULL,
  has_attachments boolean DEFAULT false,
  attachment_types jsonb DEFAULT '[]',
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Integration Sync History Table
CREATE TABLE IF NOT EXISTS integration_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integration_configurations(id) ON DELETE CASCADE,
  sync_type text DEFAULT 'manual' CHECK (sync_type IN ('manual', 'scheduled', 'webhook')),
  direction text NOT NULL CHECK (direction IN ('push', 'pull')),
  data_type text NOT NULL,
  record_count integer DEFAULT 0,
  sync_status text NOT NULL CHECK (sync_status IN ('success', 'partial', 'failed')),
  request_payload jsonb DEFAULT '{}',
  response_data jsonb DEFAULT '{}',
  error_message text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Family Email Preferences Table
CREATE TABLE IF NOT EXISTS family_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  email_verified boolean DEFAULT false,
  can_receive_daily_notes boolean DEFAULT true,
  can_receive_incidents boolean DEFAULT true,
  can_receive_care_plan_updates boolean DEFAULT true,
  can_receive_weekly_summaries boolean DEFAULT true,
  consent_given_at timestamptz DEFAULT now(),
  consent_revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_member_id, resident_id)
);

-- Webhook Events Table
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  headers jsonb DEFAULT '{}',
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_integration_configs_org ON integration_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configurations(integration_type);
CREATE INDEX IF NOT EXISTS idx_export_logs_org_date ON export_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_user ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_status ON export_logs(export_status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_org_date ON email_delivery_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_status ON email_delivery_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_resident ON email_delivery_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_org_date ON integration_sync_history(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_integration ON integration_sync_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON integration_sync_history(sync_status);
CREATE INDEX IF NOT EXISTS idx_family_email_prefs_family ON family_email_preferences(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_email_prefs_resident ON family_email_preferences(resident_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_org ON webhook_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(processing_status);

-- Enable Row Level Security
ALTER TABLE integration_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_configurations
CREATE POLICY "Organization staff can view integration configs"
  ON integration_configurations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage integration configs"
  ON integration_configurations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'facility_director')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'facility_director')
    )
  );

-- RLS Policies for export_logs
CREATE POLICY "Organization staff can view export logs"
  ON export_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create export logs"
  ON export_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- RLS Policies for email_delivery_logs
CREATE POLICY "Organization staff can view email logs"
  ON email_delivery_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can create email logs"
  ON email_delivery_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for integration_sync_history
CREATE POLICY "Organization staff can view sync history"
  ON integration_sync_history FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create sync history records"
  ON integration_sync_history FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for family_email_preferences
CREATE POLICY "Family members can view own email preferences"
  ON family_email_preferences FOR SELECT
  TO authenticated
  USING (
    family_member_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage own email preferences"
  ON family_email_preferences FOR ALL
  TO authenticated
  USING (family_member_id = auth.uid())
  WITH CHECK (family_member_id = auth.uid());

CREATE POLICY "Organization staff can manage family email preferences"
  ON family_email_preferences FOR ALL
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

-- RLS Policies for webhook_events
CREATE POLICY "Organization admins can view webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'facility_director')
    )
  );

CREATE POLICY "System can create webhook events"
  ON webhook_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_configurations_updated_at
  BEFORE UPDATE ON integration_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_email_preferences_updated_at
  BEFORE UPDATE ON family_email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();