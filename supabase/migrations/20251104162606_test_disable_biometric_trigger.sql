/*
  # Temporarily Disable Biometric Trigger to Test

  ## Overview
  This migration temporarily disables the biometric_settings trigger
  to test if it's the cause of the signup failure.

  ## Changes Made
  1. Drop the trigger temporarily
  2. We can re-add it later once we identify the issue
*/

-- Drop the trigger temporarily to test
DROP TRIGGER IF EXISTS trigger_initialize_biometric_settings ON auth.users;
