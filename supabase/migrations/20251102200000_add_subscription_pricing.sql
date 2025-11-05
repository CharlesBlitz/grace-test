/*
  # Add Subscription Pricing System

  1. New Tables
    - `subscription_plans`
      - Defines all available subscription tiers with pricing and features
      - Supports both individual/family plans and organization plans
    - `user_subscriptions`
      - Links users to their active subscription plans
      - Tracks billing cycle, renewal dates, and payment status
    - `subscription_features`
      - Defines available features that can be assigned to plans
    - `plan_features`
      - Junction table linking plans to their included features
    - `subscription_usage`
      - Tracks usage metrics for quota enforcement

  2. Security
    - Enable RLS on all tables
    - Add policies for users to view their own subscriptions
    - Add policies for organizations to manage their subscriptions
    - Admin-only policies for plan management

  3. Features
    - Free, Essential, Plus, and Premium tiers for individuals
    - Trial, Basic, Professional, and Enterprise for organizations
    - Feature-based access control
    - Usage tracking and quota management
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  plan_type text NOT NULL CHECK (plan_type IN ('individual', 'family', 'organization')),
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  max_users integer,
  max_residents integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription_features table
CREATE TABLE IF NOT EXISTS subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  description text,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create plan_features junction table
CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id uuid REFERENCES subscription_features(id) ON DELETE CASCADE,
  feature_limit integer,
  is_unlimited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'suspended')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_or_org_check CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR
    (user_id IS NULL AND organization_id IS NOT NULL)
  )
);

-- Create subscription_usage table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  usage_count integer DEFAULT 0,
  period_start timestamptz DEFAULT now(),
  period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans (public read for active plans)
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for subscription_features
CREATE POLICY "Anyone can view features"
  ON subscription_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for plan_features
CREATE POLICY "Anyone can view plan features"
  ON plan_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view org subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'admin')
    )
  );

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization admins can update org subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'admin')
      AND can_manage_billing = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('organization_admin', 'admin')
      AND can_manage_billing = true
    )
  );

-- Policies for subscription_usage
CREATE POLICY "Users can view own usage"
  ON subscription_usage
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM user_subscriptions
      WHERE user_id = auth.uid()
    )
  );

-- Insert individual/family subscription plans
INSERT INTO subscription_plans (name, slug, description, plan_type, price_monthly, price_yearly, display_order, is_featured) VALUES
  ('Free', 'free', 'Basic features to get started', 'individual', 0, 0, 1, false),
  ('Essential', 'essential', 'Perfect for independent seniors and families', 'individual', 9.99, 99, 2, false),
  ('Plus', 'plus', 'Advanced monitoring for active family care', 'individual', 19.99, 199, 3, true),
  ('Premium', 'premium', 'Complete care coordination with priority support', 'individual', 34.99, 349, 4, false);

-- Insert organization subscription plans
INSERT INTO subscription_plans (name, slug, description, plan_type, price_monthly, price_yearly, display_order, max_residents) VALUES
  ('Trial', 'trial', '30-day free trial for care facilities', 'organization', 0, 0, 1, 10),
  ('Basic', 'basic', 'Essential features for small facilities', 'organization', 159, 1590, 2, 50),
  ('Professional', 'professional', 'Advanced features for growing facilities', 'organization', 399, 3990, 3, 150),
  ('Enterprise', 'enterprise', 'Full platform for large organizations', 'organization', 0, 0, 4, NULL);

-- Insert subscription features
INSERT INTO subscription_features (feature_key, feature_name, description, category) VALUES
  -- Conversation features
  ('voice_conversations', 'Voice Conversations', 'AI voice conversations with Grace', 'communication'),
  ('voice_cloning', 'Voice Cloning', 'Clone family member voices for reminders', 'communication'),
  ('voice_cloning_count', 'Voice Clone Limit', 'Number of voices that can be cloned', 'communication'),

  -- Reminder features
  ('reminders', 'Reminders', 'Medication and task reminders', 'reminders'),
  ('reminder_sms', 'SMS Reminders', 'Deliver reminders via text message', 'reminders'),
  ('reminder_calls', 'Voice Call Reminders', 'Deliver reminders via phone call', 'reminders'),
  ('escalation_alerts', 'Escalation Alerts', 'Alert family when reminders are missed', 'reminders'),

  -- Family features
  ('family_members', 'Family Dashboard Access', 'Number of family members with dashboard access', 'family'),
  ('real_time_notifications', 'Real-time Notifications', 'Instant notifications for family', 'family'),
  ('medication_reports', 'Medication Reports', 'Detailed medication adherence reports', 'family'),

  -- Storage features
  ('photo_storage', 'Photo Storage', 'Number of photos that can be stored', 'storage'),
  ('document_storage_gb', 'Document Storage', 'Document storage in GB', 'storage'),
  ('voice_messages', 'Voice Messages Library', 'Save and replay voice messages', 'storage'),

  -- Analytics features
  ('wellness_insights', 'AI Wellness Insights', 'AI-powered health trend analysis', 'analytics'),
  ('advanced_analytics', 'Advanced Analytics', 'Comprehensive care analytics', 'analytics'),

  -- Support features
  ('support_email', 'Email Support', 'Support via email', 'support'),
  ('support_phone', 'Phone Support', 'Priority phone support', 'support'),
  ('support_priority', '24/7 Priority Support', 'Round-the-clock priority support', 'support'),
  ('white_glove_onboarding', 'White-glove Onboarding', 'Personalized setup assistance', 'support'),

  -- Data features
  ('data_retention_months', 'Data Retention', 'Conversation data retention period in months', 'data'),
  ('electronic_signatures', 'Electronic Signatures', 'Legally compliant e-signatures', 'data'),

  -- Organization features
  ('care_plans', 'Care Plans & Assessments', 'Comprehensive care planning', 'organization'),
  ('staff_scheduling', 'Staff Scheduling', 'Staff shift and task management', 'organization'),
  ('family_portal', 'Family Portal', 'Secure family communication portal', 'organization'),
  ('api_access', 'API Access', 'Integration with external systems', 'organization'),
  ('custom_branding', 'Custom Branding', 'White-label options', 'organization'),
  ('multi_facility', 'Multi-facility Support', 'Manage multiple locations', 'organization');

-- Link features to Free plan
INSERT INTO plan_features (plan_id, feature_id, feature_limit, is_unlimited)
SELECT
  (SELECT id FROM subscription_plans WHERE slug = 'free'),
  id,
  CASE feature_key
    WHEN 'voice_conversations' THEN 10
    WHEN 'reminders' THEN 5
    WHEN 'family_members' THEN 1
    WHEN 'photo_storage' THEN 0
    WHEN 'data_retention_months' THEN 12
    ELSE NULL
  END,
  false
FROM subscription_features
WHERE feature_key IN ('voice_conversations', 'reminders', 'reminder_sms', 'family_members', 'support_email', 'data_retention_months');

-- Link features to Essential plan
INSERT INTO plan_features (plan_id, feature_id, feature_limit, is_unlimited)
SELECT
  (SELECT id FROM subscription_plans WHERE slug = 'essential'),
  id,
  CASE feature_key
    WHEN 'voice_cloning_count' THEN 1
    WHEN 'family_members' THEN 3
    WHEN 'photo_storage' THEN 100
    WHEN 'data_retention_months' THEN 12
    ELSE NULL
  END,
  CASE feature_key
    WHEN 'voice_conversations' THEN true
    WHEN 'reminders' THEN true
    ELSE false
  END
FROM subscription_features
WHERE feature_key IN ('voice_conversations', 'reminders', 'reminder_sms', 'reminder_calls', 'voice_cloning', 'voice_cloning_count', 'family_members', 'photo_storage', 'support_email', 'data_retention_months');

-- Link features to Plus plan
INSERT INTO plan_features (plan_id, feature_id, feature_limit, is_unlimited)
SELECT
  (SELECT id FROM subscription_plans WHERE slug = 'plus'),
  id,
  CASE feature_key
    WHEN 'voice_cloning_count' THEN 3
    WHEN 'family_members' THEN 5
    WHEN 'document_storage_gb' THEN 5
    WHEN 'data_retention_months' THEN 24
    ELSE NULL
  END,
  CASE feature_key
    WHEN 'voice_conversations' THEN true
    WHEN 'reminders' THEN true
    WHEN 'photo_storage' THEN true
    ELSE false
  END
FROM subscription_features
WHERE feature_key IN ('voice_conversations', 'reminders', 'reminder_sms', 'reminder_calls', 'voice_cloning', 'voice_cloning_count', 'family_members', 'photo_storage', 'escalation_alerts', 'real_time_notifications', 'medication_reports', 'voice_messages', 'document_storage_gb', 'support_email', 'support_phone', 'data_retention_months');

-- Link features to Premium plan
INSERT INTO plan_features (plan_id, feature_id, feature_limit, is_unlimited)
SELECT
  (SELECT id FROM subscription_plans WHERE slug = 'premium'),
  id,
  CASE feature_key
    WHEN 'data_retention_months' THEN 36
    ELSE NULL
  END,
  CASE feature_key
    WHEN 'voice_conversations' THEN true
    WHEN 'reminders' THEN true
    WHEN 'photo_storage' THEN true
    WHEN 'voice_cloning_count' THEN true
    WHEN 'family_members' THEN true
    WHEN 'document_storage_gb' THEN true
    ELSE false
  END
FROM subscription_features
WHERE feature_key IN ('voice_conversations', 'reminders', 'reminder_sms', 'reminder_calls', 'voice_cloning', 'voice_cloning_count', 'family_members', 'photo_storage', 'escalation_alerts', 'real_time_notifications', 'medication_reports', 'voice_messages', 'document_storage_gb', 'wellness_insights', 'electronic_signatures', 'support_email', 'support_phone', 'support_priority', 'white_glove_onboarding', 'data_retention_months');

-- Create function to get user's current subscription with features
CREATE OR REPLACE FUNCTION get_user_subscription_features(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_slug text,
  plan_name text,
  status text,
  feature_key text,
  feature_limit integer,
  is_unlimited boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    sp.slug,
    sp.name,
    us.status,
    sf.feature_key,
    pf.feature_limit,
    pf.is_unlimited
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  JOIN plan_features pf ON sp.id = pf.plan_id
  JOIN subscription_features sf ON pf.feature_id = sf.id
  WHERE us.user_id = p_user_id
  AND us.status IN ('active', 'trial')
  AND (us.current_period_end IS NULL OR us.current_period_end > now())
  ORDER BY sf.feature_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has access to a feature
CREATE OR REPLACE FUNCTION user_has_feature(p_user_id uuid, p_feature_key text)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    JOIN plan_features pf ON sp.id = pf.plan_id
    JOIN subscription_features sf ON pf.feature_id = sf.id
    WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trial')
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
    AND sf.feature_key = p_feature_key
  ) INTO has_access;

  RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_org_id ON user_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);
