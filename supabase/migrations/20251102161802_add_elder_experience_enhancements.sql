/*
  # Elder Experience Enhancements

  ## Overview
  Adds comprehensive features to improve the elder user experience including accessibility
  settings, wellness tracking, medication photo documentation, voice messages, photo sharing,
  and emergency help functionality.

  ## New Tables Created

  1. **elder_settings** - Personalized accessibility and preference settings
  2. **wellness_check_ins** - Daily wellness assessments
  3. **medication_logs** - Medication tracking with photo documentation
  4. **voice_messages** - Two-way voice messaging between elders and family
  5. **photo_shares** - Photos shared by elders with family members
  6. **emergency_requests** - Emergency help requests with location data
  7. **activity_log** - Simplified activity tracking for elder view

  ## Security
  - All tables have RLS enabled
  - Elders can only access their own data
  - Family members can view their elder's data
*/

-- Create elder_settings table
CREATE TABLE IF NOT EXISTS elder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Accessibility preferences
  font_size text DEFAULT 'large' CHECK (font_size IN ('normal', 'large', 'extra_large')),
  voice_speed numeric DEFAULT 1.0 CHECK (voice_speed >= 0.5 AND voice_speed <= 2.0),
  contrast_mode text DEFAULT 'normal' CHECK (contrast_mode IN ('normal', 'high')),
  enable_voice_control boolean DEFAULT true,
  enable_screen_reader boolean DEFAULT false,
  
  -- Notification preferences
  reminder_sound text DEFAULT 'gentle',
  vibration_enabled boolean DEFAULT true,
  notification_volume integer DEFAULT 80 CHECK (notification_volume >= 0 AND notification_volume <= 100),
  
  -- Language and localization
  preferred_language text DEFAULT 'en',
  time_format text DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  date_format text DEFAULT 'MDY',
  
  -- Emergency settings
  emergency_button_enabled boolean DEFAULT true,
  auto_location_sharing boolean DEFAULT true,
  
  -- Display preferences
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  reduce_motion boolean DEFAULT false,
  large_buttons boolean DEFAULT true,
  
  -- Additional settings
  settings jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(elder_id)
);

-- Create wellness_check_ins table
CREATE TABLE IF NOT EXISTS wellness_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Check-in data
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time time NOT NULL DEFAULT CURRENT_TIME,
  
  -- Wellness metrics
  mood_rating integer CHECK (mood_rating >= 1 AND mood_rating <= 5),
  mood_description text,
  pain_level integer CHECK (pain_level >= 0 AND pain_level <= 10),
  pain_location text,
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  
  -- Sleep quality
  sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  hours_slept numeric,
  
  -- Additional notes
  notes text,
  voice_recording_url text,
  sentiment text,
  
  -- Flags for care team
  needs_attention boolean DEFAULT false,
  reviewed_by_staff_id uuid REFERENCES users(id),
  reviewed_at timestamptz,
  staff_notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Create medication_logs table
CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  care_task_id uuid REFERENCES care_tasks(id) ON DELETE SET NULL,
  
  -- Medication details
  medication_name text NOT NULL,
  dosage text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  
  -- Administration details
  administered_at timestamptz,
  administered_by_staff_id uuid REFERENCES users(id),
  administration_method text,
  
  -- Photo documentation
  photo_url text,
  photo_taken_at timestamptz,
  
  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'refused', 'late')),
  missed_reason text,
  
  -- Verification
  verified_by_staff_id uuid REFERENCES users(id),
  requires_two_person_check boolean DEFAULT false,
  second_verifier_staff_id uuid REFERENCES users(id),
  
  -- Notes
  notes text,
  side_effects_reported text,
  
  created_at timestamptz DEFAULT now()
);

-- Create voice_messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message content
  audio_url text NOT NULL,
  duration_seconds integer,
  transcription text,
  
  -- Metadata
  is_read boolean DEFAULT false,
  is_listened boolean DEFAULT false,
  listened_at timestamptz,
  
  -- Context
  related_to_task_id uuid REFERENCES care_tasks(id),
  is_emergency boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);

-- Create photo_shares table
CREATE TABLE IF NOT EXISTS photo_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Photo details
  photo_url text NOT NULL,
  thumbnail_url text,
  caption text,
  
  -- Sharing
  shared_with_nok_ids uuid[] DEFAULT ARRAY[]::uuid[],
  is_public_in_facility boolean DEFAULT false,
  
  -- Engagement
  reaction_count integer DEFAULT 0,
  reactions jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  taken_at timestamptz DEFAULT now(),
  location text,
  activity_type text,
  
  created_at timestamptz DEFAULT now()
);

-- Create emergency_requests table
CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Request details
  request_type text DEFAULT 'help' CHECK (request_type IN ('help', 'medical', 'fall', 'panic', 'other')),
  urgency_level text DEFAULT 'high' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Location data
  location_latitude numeric,
  location_longitude numeric,
  location_description text,
  location_accuracy_meters numeric,
  
  -- Voice recording
  voice_recording_url text,
  transcription text,
  
  -- Response tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'responding', 'resolved', 'cancelled')),
  acknowledged_at timestamptz,
  acknowledged_by_staff_id uuid REFERENCES users(id),
  responded_at timestamptz,
  responded_by_staff_id uuid REFERENCES users(id),
  resolved_at timestamptz,
  
  -- Escalation tracking
  escalation_contacts_notified uuid[] DEFAULT ARRAY[]::uuid[],
  escalation_level integer DEFAULT 1,
  
  -- Resolution
  resolution_notes text,
  false_alarm boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

-- Create activity_log table for elder view
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type text NOT NULL,
  activity_title text NOT NULL,
  activity_description text,
  
  -- Completion tracking
  completed_at timestamptz,
  completion_confirmed_by text,
  
  -- Visual feedback
  icon text,
  color text,
  achievement_unlocked text,
  
  -- Streak tracking
  is_part_of_streak boolean DEFAULT false,
  streak_count integer DEFAULT 0,
  
  -- Context
  related_task_id uuid REFERENCES care_tasks(id),
  related_reminder_id uuid,
  
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_elder_settings_elder ON elder_settings(elder_id);
CREATE INDEX IF NOT EXISTS idx_wellness_check_ins_elder_date ON wellness_check_ins(elder_id, check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_check_ins_needs_attention ON wellness_check_ins(elder_id) WHERE needs_attention = true;
CREATE INDEX IF NOT EXISTS idx_medication_logs_elder_scheduled ON medication_logs(elder_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_status ON medication_logs(elder_id, status) WHERE status IN ('pending', 'missed');
CREATE INDEX IF NOT EXISTS idx_voice_messages_recipient ON voice_messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_voice_messages_sender ON voice_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_shares_elder ON photo_shares(elder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_elder_active ON emergency_requests(elder_id, status) WHERE status IN ('active', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_activity_log_elder ON activity_log(elder_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE elder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for elder_settings
CREATE POLICY "Elders can view own settings"
  ON elder_settings FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "Elders can update own settings"
  ON elder_settings FOR UPDATE
  TO authenticated
  USING (elder_id = auth.uid())
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "Elders can insert own settings"
  ON elder_settings FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder settings"
  ON elder_settings FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- RLS Policies for wellness_check_ins
CREATE POLICY "Elders can view own check-ins"
  ON wellness_check_ins FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "Elders can insert own check-ins"
  ON wellness_check_ins FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder check-ins"
  ON wellness_check_ins FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- RLS Policies for medication_logs
CREATE POLICY "Elders can view own medication logs"
  ON medication_logs FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "Elders can insert own medication logs"
  ON medication_logs FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "Elders can update own medication logs"
  ON medication_logs FOR UPDATE
  TO authenticated
  USING (elder_id = auth.uid())
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder medication logs"
  ON medication_logs FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- RLS Policies for voice_messages
CREATE POLICY "Users can view messages sent to them"
  ON voice_messages FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can view messages they sent"
  ON voice_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can send voice messages"
  ON voice_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update message read status"
  ON voice_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- RLS Policies for photo_shares
CREATE POLICY "Elders can view own photos"
  ON photo_shares FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "Elders can manage own photos"
  ON photo_shares FOR ALL
  TO authenticated
  USING (elder_id = auth.uid())
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder photos"
  ON photo_shares FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
    OR auth.uid() = ANY(shared_with_nok_ids)
  );

-- RLS Policies for emergency_requests
CREATE POLICY "Elders can view own emergency requests"
  ON emergency_requests FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "Elders can create emergency requests"
  ON emergency_requests FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = auth.uid());

CREATE POLICY "NOKs can view elder emergency requests"
  ON emergency_requests FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- RLS Policies for activity_log
CREATE POLICY "Elders can view own activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

CREATE POLICY "System can insert activity log entries"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "NOKs can view elder activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- Create function to automatically create default elder settings
CREATE OR REPLACE FUNCTION create_default_elder_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'elder' THEN
    INSERT INTO elder_settings (elder_id)
    VALUES (NEW.id)
    ON CONFLICT (elder_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create default settings for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_default_elder_settings'
  ) THEN
    CREATE TRIGGER trigger_create_default_elder_settings
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_default_elder_settings();
  END IF;
END $$;

-- Create function to calculate medication adherence
CREATE OR REPLACE FUNCTION calculate_medication_adherence(
  p_elder_id uuid,
  p_days integer DEFAULT 30
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_scheduled integer;
  v_taken_count integer;
  v_adherence_rate numeric;
BEGIN
  SELECT COUNT(*)
  INTO v_total_scheduled
  FROM medication_logs
  WHERE elder_id = p_elder_id
    AND scheduled_time >= (now() - (p_days || ' days')::interval);
  
  SELECT COUNT(*)
  INTO v_taken_count
  FROM medication_logs
  WHERE elder_id = p_elder_id
    AND status = 'taken'
    AND scheduled_time >= (now() - (p_days || ' days')::interval);
  
  IF v_total_scheduled = 0 THEN
    RETURN 100;
  END IF;
  
  v_adherence_rate := (v_taken_count::numeric / v_total_scheduled::numeric) * 100;
  
  RETURN ROUND(v_adherence_rate, 2);
END;
$$;
