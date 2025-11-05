/*
  # Error Logging and Monitoring System

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `error_message` (text, error description)
      - `error_stack` (text, stack trace)
      - `severity` (text, enum: low, medium, high, critical)
      - `user_id` (uuid, optional)
      - `organization_id` (uuid, optional)
      - `request_path` (text, API path)
      - `request_method` (text, HTTP method)
      - `user_agent` (text)
      - `ip_address` (text)
      - `additional_context` (jsonb)
      - `occurred_at` (timestamptz)
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, optional)
      - `resolved_by` (uuid, optional)
      - `resolution_notes` (text, optional)
    
    - `system_health_checks`
      - `id` (uuid, primary key)
      - `check_type` (text, e.g., 'api', 'database', 'email', 'sms')
      - `status` (text, enum: healthy, degraded, down)
      - `response_time_ms` (integer)
      - `error_message` (text, optional)
      - `checked_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Only admins and system can insert/view error logs
    - System health checks readable by authenticated users
*/

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  error_stack text,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  request_path text,
  request_method text,
  user_agent text,
  ip_address text,
  additional_context jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text
);

-- Create indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred_at ON error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved_at) WHERE resolved_at IS NULL;

-- Create system_health_checks table
CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms integer,
  error_message text,
  checked_at timestamptz DEFAULT now(),
  additional_data jsonb DEFAULT '{}'::jsonb
);

-- Create index for health checks
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON system_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_type ON system_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_logs

-- Admins can view all error logs
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can insert error logs
CREATE POLICY "Service can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update error logs
CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for system_health_checks

-- Authenticated users can view health checks
CREATE POLICY "Authenticated users can view health checks"
  ON system_health_checks FOR SELECT
  TO authenticated
  USING (true);

-- Service can insert health checks
CREATE POLICY "Service can insert health checks"
  ON system_health_checks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(
  p_organization_id uuid DEFAULT NULL,
  p_time_range text DEFAULT 'day'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time timestamptz;
  v_result jsonb;
BEGIN
  -- Calculate start time based on range
  CASE p_time_range
    WHEN 'hour' THEN v_start_time := now() - interval '1 hour';
    WHEN 'day' THEN v_start_time := now() - interval '1 day';
    WHEN 'week' THEN v_start_time := now() - interval '7 days';
    ELSE v_start_time := now() - interval '1 day';
  END CASE;

  -- Get statistics
  SELECT jsonb_build_object(
    'total_errors', COUNT(*),
    'critical_errors', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high_errors', COUNT(*) FILTER (WHERE severity = 'high'),
    'medium_errors', COUNT(*) FILTER (WHERE severity = 'medium'),
    'low_errors', COUNT(*) FILTER (WHERE severity = 'low'),
    'unresolved_errors', COUNT(*) FILTER (WHERE resolved_at IS NULL),
    'errors_by_hour', (
      SELECT jsonb_object_agg(
        to_char(hour, 'HH24:00'),
        error_count
      )
      FROM (
        SELECT 
          date_trunc('hour', occurred_at) as hour,
          COUNT(*) as error_count
        FROM error_logs
        WHERE occurred_at >= v_start_time
          AND (p_organization_id IS NULL OR organization_id = p_organization_id)
        GROUP BY date_trunc('hour', occurred_at)
        ORDER BY hour
      ) hourly_errors
    )
  ) INTO v_result
  FROM error_logs
  WHERE occurred_at >= v_start_time
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);

  RETURN v_result;
END;
$$;

-- Create function to record health check
CREATE OR REPLACE FUNCTION record_health_check(
  p_check_type text,
  p_status text,
  p_response_time_ms integer DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check_id uuid;
BEGIN
  INSERT INTO system_health_checks (
    check_type,
    status,
    response_time_ms,
    error_message
  ) VALUES (
    p_check_type,
    p_status,
    p_response_time_ms,
    p_error_message
  )
  RETURNING id INTO v_check_id;

  RETURN v_check_id;
END;
$$;