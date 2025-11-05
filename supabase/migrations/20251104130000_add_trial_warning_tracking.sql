/*
  # Add Trial Warning Tracking

  1. Changes
    - Add trial_warning_sent_at column to user_subscriptions
    - Add trial_expired_notification_sent_at column to user_subscriptions

  2. Purpose
    - Track when warning emails have been sent to prevent duplicates
    - Enable automated trial expiration monitoring
*/

-- Add trial notification tracking columns
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS trial_warning_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_expired_notification_sent_at timestamptz;

-- Create view for monitoring expiring trials
CREATE OR REPLACE VIEW expiring_trials AS
SELECT
  us.id,
  us.user_id,
  us.organization_id,
  us.trial_ends_at,
  us.trial_warning_sent_at,
  us.status,
  u.email as user_email,
  u.name as user_name,
  o.email as org_email,
  o.name as org_name,
  sp.name as plan_name,
  EXTRACT(DAY FROM (us.trial_ends_at - now())) as days_remaining
FROM user_subscriptions us
LEFT JOIN users u ON us.user_id = u.id
LEFT JOIN organizations o ON us.organization_id = o.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'trial'
AND us.trial_ends_at IS NOT NULL
AND us.trial_ends_at > now()
ORDER BY us.trial_ends_at;

-- Create index for faster trial monitoring queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_status
  ON user_subscriptions(status, trial_ends_at)
  WHERE status = 'trial' AND trial_ends_at IS NOT NULL;
