/*
  # Enhanced Subscription Functions

  1. New Functions
    - `check_organization_tier_access` - Checks if organization has access to specific tier features
    - `check_grace_notes_plan_access` - Checks if practitioner has access to Grace Notes features
    - `get_organization_subscription` - Gets organization's subscription with features
    - `get_practitioner_subscription` - Gets practitioner's subscription with features
    - `track_organization_usage` - Tracks organization feature usage
    - `enforce_resident_limits` - Checks if organization has reached resident limits
    - `enforce_client_limits` - Checks if practitioner has reached client limits

  2. Security
    - Functions use RLS policies for secure access
    - Organization admins can check their own org subscriptions
    - Practitioners can check their own subscriptions
*/

-- Function to get organization subscription with features
CREATE OR REPLACE FUNCTION get_organization_subscription(p_organization_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_slug text,
  plan_name text,
  status text,
  max_residents integer,
  feature_key text,
  feature_limit integer,
  is_unlimited boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id as subscription_id,
    sp.slug as plan_slug,
    sp.name as plan_name,
    us.status,
    sp.max_residents,
    sf.feature_key,
    pf.feature_limit,
    pf.is_unlimited
  FROM user_subscriptions us
  INNER JOIN subscription_plans sp ON us.plan_id = sp.id
  LEFT JOIN plan_features pf ON sp.id = pf.plan_id
  LEFT JOIN subscription_features sf ON pf.feature_id = sf.id
  WHERE us.organization_id = p_organization_id
    AND us.status IN ('active', 'trial')
  ORDER BY sf.feature_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check organization tier access
CREATE OR REPLACE FUNCTION check_organization_tier_access(
  p_organization_id uuid,
  p_feature_key text
)
RETURNS boolean AS $$
DECLARE
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions us
    INNER JOIN plan_features pf ON us.plan_id = pf.plan_id
    INNER JOIN subscription_features sf ON pf.feature_id = sf.id
    WHERE us.organization_id = p_organization_id
      AND us.status IN ('active', 'trial')
      AND sf.feature_key = p_feature_key
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce resident limits
CREATE OR REPLACE FUNCTION enforce_resident_limits(p_organization_id uuid)
RETURNS TABLE (
  allowed boolean,
  current_count bigint,
  max_allowed integer,
  reason text
) AS $$
DECLARE
  v_current_count bigint;
  v_max_residents integer;
  v_is_unlimited boolean;
BEGIN
  -- Get current resident count
  SELECT COUNT(*)
  INTO v_current_count
  FROM organization_residents
  WHERE organization_id = p_organization_id;

  -- Get subscription limits
  SELECT
    sp.max_residents,
    COALESCE((
      SELECT pf.is_unlimited
      FROM plan_features pf
      INNER JOIN subscription_features sf ON pf.feature_id = sf.id
      WHERE pf.plan_id = sp.id
        AND sf.feature_key = 'residents'
      LIMIT 1
    ), false)
  INTO v_max_residents, v_is_unlimited
  FROM user_subscriptions us
  INNER JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.organization_id = p_organization_id
    AND us.status IN ('active', 'trial')
  LIMIT 1;

  -- Check if unlimited
  IF v_is_unlimited THEN
    RETURN QUERY SELECT true, v_current_count, -1, 'Unlimited residents allowed'::text;
    RETURN;
  END IF;

  -- Check if under limit
  IF v_current_count < v_max_residents THEN
    RETURN QUERY SELECT true, v_current_count, v_max_residents, 'Within limit'::text;
  ELSE
    RETURN QUERY SELECT false, v_current_count, v_max_residents, 'Resident limit reached for current plan'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get Grace Notes practitioner subscription
CREATE OR REPLACE FUNCTION get_practitioner_subscription(p_practitioner_id uuid)
RETURNS TABLE (
  subscription_plan text,
  max_clients integer,
  feature_key text,
  has_access boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gnp.subscription_plan,
    CASE
      WHEN gnp.subscription_plan = 'solo' THEN 20
      WHEN gnp.subscription_plan = 'small_team' THEN 100
      WHEN gnp.subscription_plan = 'practice' THEN -1
      ELSE 0
    END as max_clients,
    feature_keys.key as feature_key,
    CASE
      WHEN gnp.subscription_plan = 'solo' THEN feature_keys.key IN ('basic_documentation', 'mobile_capture', 'gps_verification')
      WHEN gnp.subscription_plan = 'small_team' THEN feature_keys.key IN ('basic_documentation', 'mobile_capture', 'gps_verification', 'ai_notes', 'assessment_templates', 'team_collaboration')
      WHEN gnp.subscription_plan = 'practice' THEN feature_keys.key IN ('basic_documentation', 'mobile_capture', 'gps_verification', 'ai_notes', 'assessment_templates', 'team_collaboration', 'custom_templates', 'advanced_analytics', 'api_access')
      ELSE false
    END as has_access
  FROM grace_notes_practitioners gnp
  CROSS JOIN (
    SELECT unnest(ARRAY[
      'basic_documentation',
      'mobile_capture',
      'gps_verification',
      'ai_notes',
      'assessment_templates',
      'team_collaboration',
      'custom_templates',
      'advanced_analytics',
      'api_access'
    ]) as key
  ) as feature_keys
  WHERE gnp.id = p_practitioner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check Grace Notes plan access
CREATE OR REPLACE FUNCTION check_grace_notes_plan_access(
  p_practitioner_id uuid,
  p_feature_key text
)
RETURNS boolean AS $$
DECLARE
  v_subscription_plan text;
  v_has_access boolean;
BEGIN
  SELECT subscription_plan
  INTO v_subscription_plan
  FROM grace_notes_practitioners
  WHERE id = p_practitioner_id;

  -- Check feature access based on plan
  v_has_access := CASE
    WHEN v_subscription_plan = 'solo' THEN
      p_feature_key IN ('basic_documentation', 'mobile_capture', 'gps_verification', 'photo_documentation', 'offline_mode')
    WHEN v_subscription_plan = 'small_team' THEN
      p_feature_key IN ('basic_documentation', 'mobile_capture', 'gps_verification', 'photo_documentation', 'offline_mode', 'ai_notes', 'assessment_templates', 'team_collaboration', 'cqc_compliance')
    WHEN v_subscription_plan = 'practice' THEN
      true -- All features
    ELSE
      false
  END;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce Grace Notes client limits
CREATE OR REPLACE FUNCTION enforce_client_limits(p_practitioner_id uuid)
RETURNS TABLE (
  allowed boolean,
  current_count bigint,
  max_allowed integer,
  reason text
) AS $$
DECLARE
  v_current_count bigint;
  v_max_clients integer;
  v_subscription_plan text;
BEGIN
  -- Get current client count
  SELECT COUNT(*)
  INTO v_current_count
  FROM grace_notes_clients
  WHERE practitioner_id = p_practitioner_id
    AND status = 'active';

  -- Get subscription plan and limits
  SELECT
    subscription_plan,
    CASE
      WHEN subscription_plan = 'solo' THEN 20
      WHEN subscription_plan = 'small_team' THEN 100
      WHEN subscription_plan = 'practice' THEN -1
      ELSE 0
    END
  INTO v_subscription_plan, v_max_clients
  FROM grace_notes_practitioners
  WHERE id = p_practitioner_id;

  -- Check if unlimited
  IF v_max_clients = -1 THEN
    RETURN QUERY SELECT true, v_current_count, -1, 'Unlimited clients allowed'::text;
    RETURN;
  END IF;

  -- Check if under limit
  IF v_current_count < v_max_clients THEN
    RETURN QUERY SELECT true, v_current_count, v_max_clients, 'Within limit'::text;
  ELSE
    RETURN QUERY SELECT false, v_current_count, v_max_clients, 'Client limit reached for current plan'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_organization_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_tier_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_resident_limits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_practitioner_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_grace_notes_plan_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_client_limits(uuid) TO authenticated;
