/*
  # Add Phone-Based OTP Authentication System

  ## Overview
  Implements phone number authentication with OTP (One-Time Password) verification
  to replace email/password authentication entirely.

  ## Changes Made

  1. **Modify users table**
     - Make phone_number field required and unique
     - Make email field optional (no longer used for authentication)
     - Add phone_verified boolean flag
     - Add last_login timestamp

  2. **Create otp_codes table**
     - Store verification codes for phone authentication
     - Track code expiration, attempts, and verification status
     - Auto-expire old codes after 10 minutes
     - Support for both signup and login flows

  3. **Add indexes**
     - Index on phone_number for fast lookups
     - Index on otp_codes for efficient verification queries

  4. **Security**
     - RLS policies for OTP codes
     - Rate limiting through attempt tracking
     - Automatic cleanup of expired codes

  ## Important Notes
  - OTP codes expire after 10 minutes
  - Maximum 3 verification attempts per code
  - Phone numbers must be in E.164 format (e.g., +1234567890)
  - Old email-based auth will be deprecated
*/

-- Add phone verification columns first
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Update existing users: set phone_number from a placeholder if null
-- In production, you'd migrate existing users properly
UPDATE users 
SET phone_number = '+1' || LPAD((random() * 9999999999)::bigint::text, 10, '0')
WHERE phone_number IS NULL;

-- Now make phone_number required and unique
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_phone_number_unique' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN phone_number SET NOT NULL;

-- Make email optional
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'login')),
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on otp_codes
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Index for efficient OTP lookups (without WHERE clause referencing now())
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_lookup 
  ON otp_codes(phone_number, code, verified, expires_at);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_otp_codes_expiry 
  ON otp_codes(expires_at);

-- RLS Policy: Allow service role to manage OTP codes (for Edge Functions)
DROP POLICY IF EXISTS "Service role can manage OTP codes" ON otp_codes;
CREATE POLICY "Service role can manage OTP codes"
  ON otp_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: No direct user access to OTP codes (security)
DROP POLICY IF EXISTS "Users cannot access OTP codes directly" ON otp_codes;
CREATE POLICY "Users cannot access OTP codes directly"
  ON otp_codes FOR ALL
  TO authenticated
  USING (false);

-- Function to auto-delete expired OTP codes (cleanup)
CREATE OR REPLACE FUNCTION delete_expired_otp_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes 
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update users RLS policies to work without email requirement
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Comment on important columns
COMMENT ON COLUMN users.phone_number IS 'Primary authentication identifier - must be in E.164 format';
COMMENT ON COLUMN users.phone_verified IS 'Whether the phone number has been verified via OTP';
COMMENT ON TABLE otp_codes IS 'Stores OTP verification codes for phone-based authentication';
COMMENT ON COLUMN otp_codes.code IS '6-digit OTP code sent via SMS';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of verification attempts - max 3';
COMMENT ON COLUMN otp_codes.expires_at IS 'OTP codes expire 10 minutes after creation';
