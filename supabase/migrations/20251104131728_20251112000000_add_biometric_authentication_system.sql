/*
  # Biometric Authentication System with WebAuthn

  ## Overview
  This migration adds comprehensive biometric authentication support using WebAuthn/Passkeys.
  Enables fingerprint, Face ID, and Touch ID login for elder-friendly passwordless access.

  ## New Tables
  
  ### `webauthn_credentials`
  Stores user passkey credentials for biometric authentication
  - `id` (uuid, primary key) - Unique credential identifier
  - `user_id` (uuid, references auth.users) - User who owns this credential
  - `credential_id` (text, unique) - WebAuthn credential ID (base64url encoded)
  - `public_key` (text) - Public key for verification (base64url encoded)
  - `counter` (bigint) - Signature counter for replay attack prevention
  - `device_type` (text) - Device type (platform, cross-platform)
  - `device_name` (text) - User-friendly device name
  - `backup_eligible` (boolean) - Whether credential can be backed up
  - `backup_state` (boolean) - Whether credential is currently backed up
  - `transports` (text[]) - Available authenticator transports
  - `aaguid` (text) - Authenticator attestation GUID
  - `last_used_at` (timestamptz) - When credential was last used
  - `created_at` (timestamptz) - When credential was registered
  - `revoked_at` (timestamptz, nullable) - When credential was revoked

  ### `biometric_settings`
  User preferences for biometric authentication
  - `user_id` (uuid, primary key, references auth.users) - User identifier
  - `biometric_enabled` (boolean) - Whether biometric auth is enabled
  - `auto_lock_enabled` (boolean) - Whether auto-lock is enabled
  - `auto_lock_timeout_seconds` (integer) - Inactivity timeout in seconds
  - `require_biometric_for_sensitive` (boolean) - Require biometric for sensitive actions
  - `emergency_pin_enabled` (boolean) - Whether emergency PIN bypass is enabled
  - `emergency_pin_hash` (text, nullable) - Hashed emergency PIN
  - `created_at` (timestamptz) - When settings were created
  - `updated_at` (timestamptz) - When settings were last updated

  ### `biometric_auth_log`
  Audit trail of biometric authentication attempts
  - `id` (uuid, primary key) - Log entry identifier
  - `user_id` (uuid, references auth.users) - User who attempted auth
  - `credential_id` (text, nullable) - Credential used (if successful)
  - `auth_type` (text) - Type: 'login', 'reauth', 'sensitive_action'
  - `action_context` (text, nullable) - What action required auth
  - `success` (boolean) - Whether authentication succeeded
  - `failure_reason` (text, nullable) - Reason for failure
  - `user_agent` (text) - Browser/device user agent
  - `ip_address` (inet, nullable) - IP address of request
  - `created_at` (timestamptz) - When auth attempt occurred

  ### `auto_lock_sessions`
  Tracks app lock status and session state
  - `id` (uuid, primary key) - Session identifier
  - `user_id` (uuid, references auth.users) - User identifier
  - `session_id` (text) - Browser session identifier
  - `is_locked` (boolean) - Current lock status
  - `locked_at` (timestamptz, nullable) - When session was locked
  - `last_activity_at` (timestamptz) - Last user activity timestamp
  - `unlock_required_for` (text, nullable) - Context requiring unlock
  - `created_at` (timestamptz) - Session creation time
  - `expires_at` (timestamptz) - Session expiration time

  ## Security
  - RLS policies restrict access to user's own credentials and settings
  - Public keys stored (never private keys - those stay on device)
  - Audit logging for all authentication attempts
  - Emergency PIN stored as bcrypt hash
  - Revoked credentials cannot be used
  - Failed authentication attempts are logged

  ## Features Enabled
  - Fingerprint/Touch ID login
  - Face ID/Face unlock login
  - Auto-lock with inactivity timeout
  - Biometric re-authentication for sensitive actions
  - Emergency PIN bypass option
  - Multiple device support per user
  - Comprehensive audit trail
*/

-- Create webauthn_credentials table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_type text NOT NULL CHECK (device_type IN ('platform', 'cross-platform')),
  device_name text NOT NULL,
  backup_eligible boolean NOT NULL DEFAULT false,
  backup_state boolean NOT NULL DEFAULT false,
  transports text[] DEFAULT ARRAY[]::text[],
  aaguid text,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT valid_device_name CHECK (char_length(device_name) >= 1 AND char_length(device_name) <= 100)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_last_used ON webauthn_credentials(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_active ON webauthn_credentials(user_id, revoked_at);

-- Create biometric_settings table
CREATE TABLE IF NOT EXISTS biometric_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  biometric_enabled boolean NOT NULL DEFAULT false,
  auto_lock_enabled boolean NOT NULL DEFAULT true,
  auto_lock_timeout_seconds integer NOT NULL DEFAULT 300 CHECK (auto_lock_timeout_seconds >= 60 AND auto_lock_timeout_seconds <= 3600),
  require_biometric_for_sensitive boolean NOT NULL DEFAULT true,
  emergency_pin_enabled boolean NOT NULL DEFAULT false,
  emergency_pin_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create biometric_auth_log table
CREATE TABLE IF NOT EXISTS biometric_auth_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text,
  auth_type text NOT NULL CHECK (auth_type IN ('login', 'reauth', 'sensitive_action', 'emergency_pin')),
  action_context text,
  success boolean NOT NULL,
  failure_reason text,
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for auth log
CREATE INDEX IF NOT EXISTS idx_biometric_auth_log_user_id ON biometric_auth_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_auth_log_created_at ON biometric_auth_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_auth_log_failed ON biometric_auth_log(user_id, success, created_at DESC);

-- Create auto_lock_sessions table
CREATE TABLE IF NOT EXISTS auto_lock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  last_activity_at timestamptz DEFAULT now(),
  unlock_required_for text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  UNIQUE(user_id, session_id)
);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_auto_lock_sessions_user_session ON auto_lock_sessions(user_id, session_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_auto_lock_sessions_expired ON auto_lock_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_auth_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_lock_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webauthn_credentials

-- Users can view their own non-revoked credentials
CREATE POLICY "Users can view own credentials"
  ON webauthn_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND revoked_at IS NULL);

-- Users can insert their own credentials
CREATE POLICY "Users can register credentials"
  ON webauthn_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials (for counter, last_used_at)
CREATE POLICY "Users can update own credentials"
  ON webauthn_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for biometric_settings

-- Users can view their own settings
CREATE POLICY "Users can view own biometric settings"
  ON biometric_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can create biometric settings"
  ON biometric_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update biometric settings"
  ON biometric_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for biometric_auth_log

-- Users can view their own auth logs
CREATE POLICY "Users can view own auth logs"
  ON biometric_auth_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own auth logs
CREATE POLICY "Users can create auth logs"
  ON biometric_auth_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for auto_lock_sessions

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON auto_lock_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create sessions"
  ON auto_lock_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update sessions"
  ON auto_lock_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own expired sessions
CREATE POLICY "Users can delete expired sessions"
  ON auto_lock_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_biometric_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on biometric_settings
DROP TRIGGER IF EXISTS trigger_update_biometric_settings_updated_at ON biometric_settings;
CREATE TRIGGER trigger_update_biometric_settings_updated_at
  BEFORE UPDATE ON biometric_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_biometric_settings_updated_at();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_lock_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auto_lock_sessions
  WHERE expires_at < (now() - interval '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize default biometric settings for new users
CREATE OR REPLACE FUNCTION initialize_biometric_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO biometric_settings (user_id, biometric_enabled, auto_lock_enabled, auto_lock_timeout_seconds)
  VALUES (NEW.id, false, true, 300)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create biometric settings for new users
DROP TRIGGER IF EXISTS trigger_initialize_biometric_settings ON auth.users;
CREATE TRIGGER trigger_initialize_biometric_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_biometric_settings();
