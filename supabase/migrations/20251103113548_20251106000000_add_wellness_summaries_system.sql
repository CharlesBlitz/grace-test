/*
  # Stage 5: Wellness Summaries System

  ## Overview
  Comprehensive wellness tracking and reporting system that generates weekly and monthly
  wellness summaries for residents with automated family notifications.

  ## New Tables Created

  1. **wellness_summaries** - Stores weekly and monthly wellness reports
     - Aggregated wellness metrics (mood, energy, sleep, pain)
     - Trend indicators and insights
     - Report metadata and generation timestamps

  2. **wellness_trends** - Tracks wellness metric changes over time
     - Historical trend data for each wellness dimension
     - Comparison data for week-over-week and month-over-month analysis
     - Statistical calculations for pattern detection

  3. **wellness_report_schedules** - Manages automated report generation
     - Schedule configuration for weekly and monthly reports
     - Last run timestamps and next scheduled execution
     - Recipient preferences and delivery settings

  4. **wellness_alerts** - Flags concerning wellness patterns
     - Alert triggers for declining wellness indicators
     - Severity levels and notification requirements
     - Resolution tracking and staff notes

  ## Security
  - Enable RLS on all tables
  - Residents can view own wellness summaries
  - Family members can view elder's wellness summaries
  - Organization staff can view all resident summaries
  - Automated system can create summaries and alerts

  ## Important Notes
  - Integrates with existing wellness_check_ins table
  - Supports both weekly and monthly report generation
  - Includes automated email delivery to family members
  - Provides trend analysis and early warning detection
*/

-- Create wellness_summaries table
CREATE TABLE IF NOT EXISTS wellness_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Report metadata
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'custom')),
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  generated_at timestamptz DEFAULT now(),
  
  -- Check-in statistics
  total_check_ins integer DEFAULT 0,
  check_in_completion_rate numeric DEFAULT 0,
  
  -- Mood metrics
  avg_mood_rating numeric,
  mood_trend text CHECK (mood_trend IN ('improving', 'stable', 'declining', 'insufficient_data')),
  best_mood_day date,
  worst_mood_day date,
  mood_variance numeric,
  
  -- Energy metrics
  avg_energy_level numeric,
  energy_trend text CHECK (energy_trend IN ('improving', 'stable', 'declining', 'insufficient_data')),
  high_energy_days integer DEFAULT 0,
  low_energy_days integer DEFAULT 0,
  
  -- Sleep metrics
  avg_sleep_quality numeric,
  avg_hours_slept numeric,
  sleep_trend text CHECK (sleep_trend IN ('improving', 'stable', 'declining', 'insufficient_data')),
  nights_with_good_sleep integer DEFAULT 0,
  nights_with_poor_sleep integer DEFAULT 0,
  
  -- Pain metrics
  avg_pain_level numeric,
  pain_trend text CHECK (pain_trend IN ('improving', 'stable', 'worsening', 'none')),
  days_with_pain integer DEFAULT 0,
  max_pain_reported numeric,
  common_pain_locations jsonb DEFAULT '[]',
  
  -- Overall wellness
  overall_wellness_score numeric,
  wellness_trend text CHECK (wellness_trend IN ('improving', 'stable', 'declining', 'mixed')),
  
  -- Insights and notes
  key_insights jsonb DEFAULT '[]',
  concerning_patterns jsonb DEFAULT '[]',
  positive_highlights jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  
  -- Comparison data
  comparison_period_start date,
  comparison_period_end date,
  comparison_metrics jsonb DEFAULT '{}',
  
  -- Family notification
  sent_to_family boolean DEFAULT false,
  family_email_sent_at timestamptz,
  family_recipients jsonb DEFAULT '[]',
  
  -- Staff review
  reviewed_by_staff_id uuid REFERENCES users(id),
  reviewed_at timestamptz,
  staff_comments text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wellness_trends table
CREATE TABLE IF NOT EXISTS wellness_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Trend metadata
  metric_type text NOT NULL CHECK (metric_type IN ('mood', 'energy', 'sleep_quality', 'pain', 'overall_wellness')),
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Time series data
  daily_values jsonb DEFAULT '[]',
  weekly_averages jsonb DEFAULT '[]',
  monthly_averages jsonb DEFAULT '[]',
  
  -- Statistical analysis
  current_value numeric,
  seven_day_avg numeric,
  thirty_day_avg numeric,
  trend_direction text CHECK (trend_direction IN ('up', 'down', 'stable')),
  trend_strength numeric DEFAULT 0,
  
  -- Variance and patterns
  standard_deviation numeric,
  coefficient_of_variation numeric,
  pattern_detected text,
  
  -- Comparison metrics
  week_over_week_change numeric,
  month_over_month_change numeric,
  percent_change numeric,
  
  -- Alert flags
  is_concerning boolean DEFAULT false,
  concern_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(elder_id, metric_type, calculation_date)
);

-- Create wellness_report_schedules table
CREATE TABLE IF NOT EXISTS wellness_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Schedule configuration
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  is_enabled boolean DEFAULT true,
  
  -- Timing
  generation_day_of_week integer CHECK (generation_day_of_week BETWEEN 0 AND 6),
  generation_day_of_month integer CHECK (generation_day_of_month BETWEEN 1 AND 31),
  generation_time time DEFAULT '09:00:00',
  timezone text DEFAULT 'UTC',
  
  -- Execution tracking
  last_generated_at timestamptz,
  last_generation_status text CHECK (last_generation_status IN ('success', 'failed', 'skipped', 'pending')),
  next_scheduled_run timestamptz,
  consecutive_failures integer DEFAULT 0,
  
  -- Delivery preferences
  send_to_family boolean DEFAULT true,
  family_recipients jsonb DEFAULT '[]',
  send_to_staff boolean DEFAULT false,
  staff_recipients jsonb DEFAULT '[]',
  
  -- Customization
  include_comparisons boolean DEFAULT true,
  include_recommendations boolean DEFAULT true,
  custom_settings jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(elder_id, report_type)
);

-- Create wellness_alerts table
CREATE TABLE IF NOT EXISTS wellness_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  wellness_summary_id uuid REFERENCES wellness_summaries(id) ON DELETE SET NULL,
  
  -- Alert details
  alert_type text NOT NULL CHECK (alert_type IN ('declining_mood', 'poor_sleep', 'high_pain', 'low_energy', 'missed_check_ins', 'rapid_decline', 'sustained_low_scores')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Alert description
  title text NOT NULL,
  description text NOT NULL,
  metric_affected text,
  current_value numeric,
  threshold_value numeric,
  
  -- Context
  detected_at timestamptz DEFAULT now(),
  date_range_start date,
  date_range_end date,
  supporting_data jsonb DEFAULT '{}',
  
  -- Response tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'investigating', 'resolved', 'dismissed')),
  acknowledged_at timestamptz,
  acknowledged_by_staff_id uuid REFERENCES users(id),
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by_staff_id uuid REFERENCES users(id),
  resolution_notes text,
  action_taken text,
  
  -- Family notification
  family_notified boolean DEFAULT false,
  family_notified_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wellness_summaries_elder_period ON wellness_summaries(elder_id, report_period_start DESC, report_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_summaries_org_date ON wellness_summaries(organization_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_summaries_type ON wellness_summaries(report_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_summaries_family_pending ON wellness_summaries(elder_id) WHERE sent_to_family = false;

CREATE INDEX IF NOT EXISTS idx_wellness_trends_elder_metric ON wellness_trends(elder_id, metric_type, calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_trends_concerning ON wellness_trends(elder_id) WHERE is_concerning = true;
CREATE INDEX IF NOT EXISTS idx_wellness_trends_date ON wellness_trends(calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_wellness_schedules_elder ON wellness_report_schedules(elder_id, report_type);
CREATE INDEX IF NOT EXISTS idx_wellness_schedules_next_run ON wellness_report_schedules(next_scheduled_run) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_wellness_schedules_org ON wellness_report_schedules(organization_id);

CREATE INDEX IF NOT EXISTS idx_wellness_alerts_elder_active ON wellness_alerts(elder_id, status) WHERE status IN ('active', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_wellness_alerts_org_severity ON wellness_alerts(organization_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_alerts_type ON wellness_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_wellness_alerts_unacknowledged ON wellness_alerts(organization_id) WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE wellness_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wellness_summaries
CREATE POLICY "Elders can view own wellness summaries"
  ON wellness_summaries FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder wellness summaries"
  ON wellness_summaries FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can view resident summaries"
  ON wellness_summaries FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create wellness summaries"
  ON wellness_summaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update wellness summaries"
  ON wellness_summaries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for wellness_trends
CREATE POLICY "Elders can view own wellness trends"
  ON wellness_trends FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder wellness trends"
  ON wellness_trends FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

CREATE POLICY "System can manage wellness trends"
  ON wellness_trends FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for wellness_report_schedules
CREATE POLICY "Elders can view own report schedules"
  ON wellness_report_schedules FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder report schedules"
  ON wellness_report_schedules FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can manage report schedules"
  ON wellness_report_schedules FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for wellness_alerts
CREATE POLICY "Elders can view own wellness alerts"
  ON wellness_alerts FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder wellness alerts"
  ON wellness_alerts FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

CREATE POLICY "Organization staff can manage wellness alerts"
  ON wellness_alerts FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamps
CREATE TRIGGER update_wellness_summaries_updated_at
  BEFORE UPDATE ON wellness_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_trends_updated_at
  BEFORE UPDATE ON wellness_trends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_report_schedules_updated_at
  BEFORE UPDATE ON wellness_report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_alerts_updated_at
  BEFORE UPDATE ON wellness_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate wellness score based on metrics
CREATE OR REPLACE FUNCTION calculate_wellness_score(
  p_mood numeric,
  p_energy numeric,
  p_sleep numeric,
  p_pain numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_score numeric;
BEGIN
  -- Calculate weighted score (0-100)
  -- Mood and Energy are 1-5 (positive), Sleep is 1-5 (positive), Pain is 0-10 (negative)
  v_score := (
    (COALESCE(p_mood, 3) / 5.0 * 30) +
    (COALESCE(p_energy, 3) / 5.0 * 25) +
    (COALESCE(p_sleep, 3) / 5.0 * 25) +
    ((10 - COALESCE(p_pain, 0)) / 10.0 * 20)
  );
  
  RETURN ROUND(v_score, 2);
END;
$$;

-- Function to determine trend direction
CREATE OR REPLACE FUNCTION determine_trend(
  p_current_value numeric,
  p_previous_value numeric,
  p_threshold numeric DEFAULT 5.0
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_percent_change numeric;
BEGIN
  IF p_previous_value IS NULL OR p_previous_value = 0 THEN
    RETURN 'insufficient_data';
  END IF;
  
  v_percent_change := ((p_current_value - p_previous_value) / p_previous_value) * 100;
  
  IF v_percent_change > p_threshold THEN
    RETURN 'improving';
  ELSIF v_percent_change < -p_threshold THEN
    RETURN 'declining';
  ELSE
    RETURN 'stable';
  END IF;
END;
$$;

-- Function to get wellness check-ins for date range
CREATE OR REPLACE FUNCTION get_wellness_check_ins_summary(
  p_elder_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_check_ins integer,
  avg_mood numeric,
  avg_energy numeric,
  avg_sleep_quality numeric,
  avg_hours_slept numeric,
  avg_pain_level numeric,
  days_with_pain integer,
  completion_rate numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_days integer;
BEGIN
  v_total_days := (p_end_date - p_start_date) + 1;
  
  RETURN QUERY
  SELECT
    COUNT(*)::integer AS total_check_ins,
    ROUND(AVG(mood_rating), 2) AS avg_mood,
    ROUND(AVG(energy_level), 2) AS avg_energy,
    ROUND(AVG(sleep_quality), 2) AS avg_sleep_quality,
    ROUND(AVG(hours_slept), 2) AS avg_hours_slept,
    ROUND(AVG(pain_level), 2) AS avg_pain_level,
    COUNT(*) FILTER (WHERE pain_level > 0)::integer AS days_with_pain,
    ROUND((COUNT(*)::numeric / v_total_days * 100), 2) AS completion_rate
  FROM wellness_check_ins
  WHERE elder_id = p_elder_id
    AND check_in_date >= p_start_date
    AND check_in_date <= p_end_date;
END;
$$;