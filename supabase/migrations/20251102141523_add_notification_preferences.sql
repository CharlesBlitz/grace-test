/*
  # Add Notification Preferences to NOK Relationships

  1. Changes
    - Add `notification_preferences` JSONB column to `elder_nok_relationships` table
    - This stores customizable notification settings for each NOK-Elder relationship
  
  2. Data Structure
    - Stores preferences like email, SMS, push notification settings
    - Includes quiet hours and daily summary preferences
    - Escalation alert preferences
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elder_nok_relationships' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE elder_nok_relationships ADD COLUMN notification_preferences JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
