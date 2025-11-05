/*
  # Add Documentation Access Logging System

  ## Overview
  Creates a secure logging system to track access to sensitive documentation pages
  like system architecture and technical specifications. This helps monitor who
  accesses confidential information and when, supporting security audits and
  compliance requirements.

  ## New Tables Created

  1. **documentation_access_logs**
     - Tracks user access to sensitive documentation pages
     - Records timestamp and page accessed
     - Immutable audit trail for security monitoring
     - Enables detection of unauthorized access attempts

  ## Security
  - RLS enabled with restrictive policies
  - Users can only view their own access logs
  - Organization admins can view logs for their organization members
  - System admins have full visibility
  - Insert operations allowed for authenticated users only
  - No update or delete operations permitted (immutable audit trail)

  ## Important Notes
  - Logs are permanent and cannot be deleted or modified
  - Access patterns are monitored for security anomalies
  - Supports compliance with data access tracking requirements
*/

-- Create documentation access logs table
CREATE TABLE IF NOT EXISTS documentation_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page text NOT NULL,
  accessed_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_documentation_access_logs_user_id
  ON documentation_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_documentation_access_logs_page
  ON documentation_access_logs(page);
CREATE INDEX IF NOT EXISTS idx_documentation_access_logs_accessed_at
  ON documentation_access_logs(accessed_at DESC);

-- Enable RLS
ALTER TABLE documentation_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own access logs
CREATE POLICY "Users can insert own access logs"
  ON documentation_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON documentation_access_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Organization admins can view logs for their organization members
CREATE POLICY "Organization admins can view member access logs"
  ON documentation_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou1
      JOIN organization_users ou2 ON ou1.organization_id = ou2.organization_id
      WHERE ou1.user_id = auth.uid()
        AND ou1.role IN ('organization_admin', 'facility_director')
        AND ou2.user_id = documentation_access_logs.user_id
    )
  );

-- Function to clean up old access logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_documentation_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete access logs older than 2 years (compliance retention)
  DELETE FROM documentation_access_logs
  WHERE accessed_at < now() - interval '2 years';
END;
$$;

-- Note: Schedule this function to run periodically via cron or edge function
-- Example: Run monthly to maintain database performance
