/*
  # Add Stripe Price IDs to Subscription Plans

  1. Changes
    - Add stripe_price_id_monthly column to subscription_plans
    - Add stripe_price_id_yearly column to subscription_plans
    - Update existing plans with Stripe price IDs from stripeConfig.ts

  2. Purpose
    - Enable webhook to map Stripe price IDs back to plan slugs
    - Support automatic subscription sync from Stripe to user_subscriptions
*/

-- Add Stripe price ID columns if not exists
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text;

-- Update individual plans with Stripe price IDs
UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPTfiCVCzUYN9npcwpKQHVu',
  stripe_price_id_yearly = 'price_1SPTjGCVCzUYN9npc46iVNT6'
WHERE slug = 'essential' AND plan_type = 'individual';

UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPTkRCVCzUYN9npTsMjkWg3',
  stripe_price_id_yearly = 'price_1SPTlTCVCzUYN9npPV5Qgkpu'
WHERE slug = 'plus' AND plan_type = 'individual';

UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPToTCVCzUYN9npkJnl99hT',
  stripe_price_id_yearly = 'price_1SPTqUCVCzUYN9npVPRiSchF'
WHERE slug = 'premium' AND plan_type = 'individual';

-- Update organization plans with Stripe price IDs
UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPTrWCVCzUYN9np69KsVYUK'
WHERE slug = 'basic' AND plan_type = 'organization';

UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPTsWCVCzUYN9np9UdMdgnx'
WHERE slug = 'professional' AND plan_type = 'organization';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_monthly
  ON subscription_plans(stripe_price_id_monthly);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_yearly
  ON subscription_plans(stripe_price_id_yearly);
