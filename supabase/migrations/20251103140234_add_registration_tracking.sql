/*
  # Add Registration Method Tracking

  1. Changes to users table
    - Add `registration_method` column to track how users registered (voice, type, family_assisted)
    - Add `registration_completed` column to track if user finished full onboarding
    
  2. Purpose
    - Track user registration preferences for personalized onboarding
    - Ensure users complete the full registration process
    - Enable analytics on registration method effectiveness
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'registration_method'
  ) THEN
    ALTER TABLE users ADD COLUMN registration_method text CHECK (registration_method IN ('voice', 'type', 'family_assisted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'registration_completed'
  ) THEN
    ALTER TABLE users ADD COLUMN registration_completed boolean DEFAULT false;
  END IF;
END $$;