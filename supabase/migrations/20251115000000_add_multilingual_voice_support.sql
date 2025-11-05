/*
  # Multilingual Voice Support with Automatic Dialect Detection

  ## Overview
  This migration adds comprehensive multilingual voice support enabling automatic
  language detection for elderly immigrants who may revert to their native language.
  Integrates with ElevenLabs multilingual capabilities for seamless language switching.

  ## New Tables

  ### `user_language_preferences`
  Stores language preferences and capabilities for each user
  - `user_id` (uuid, primary key, references auth.users) - User identifier
  - `primary_language` (text) - Primary/native language code (ISO 639-1)
  - `primary_language_name` (text) - Human-readable language name
  - `primary_dialect` (text, nullable) - Specific dialect or regional variant
  - `secondary_languages` (text[]) - Additional languages user speaks
  - `fluency_levels` (jsonb) - Language code to fluency mapping (native, fluent, conversational, basic)
  - `preferred_voice_id` (jsonb) - Language code to ElevenLabs voice ID mapping
  - `auto_detect_enabled` (boolean) - Whether to enable automatic language detection
  - `cultural_context` (jsonb) - Cultural preferences tied to languages
  - `created_at` (timestamptz) - When preferences were created
  - `updated_at` (timestamptz) - When preferences were last updated

  ### `conversation_language_events`
  Tracks language switches during conversations for analytics and insights
  - `id` (uuid, primary key) - Event identifier
  - `user_id` (uuid, references auth.users) - User who had the conversation
  - `conversation_id` (uuid, nullable) - Related conversation identifier
  - `detected_language` (text) - Language code detected
  - `confidence_score` (numeric) - Detection confidence (0-1)
  - `previous_language` (text, nullable) - Previous language in conversation
  - `trigger_type` (text) - What triggered detection: 'automatic', 'manual', 'emergency'
  - `context` (text, nullable) - Conversation context when switch occurred
  - `emotional_state` (text, nullable) - Detected emotional state: 'calm', 'distressed', 'confused'
  - `transcript_snippet` (text, nullable) - Short snippet of what was said
  - `duration_seconds` (integer, nullable) - How long user spoke in this language
  - `created_at` (timestamptz) - When language switch occurred

  ### `language_voice_mappings`
  Maps languages to appropriate ElevenLabs voice IDs with metadata
  - `id` (uuid, primary key) - Mapping identifier
  - `language_code` (text) - ISO 639-1 language code
  - `language_name` (text) - Human-readable language name
  - `dialect` (text, nullable) - Specific dialect or regional variant
  - `voice_id` (text) - ElevenLabs voice ID
  - `voice_name` (text) - Human-readable voice name
  - `voice_gender` (text) - Voice gender: 'male', 'female', 'neutral'
  - `voice_age_range` (text) - Appropriate age: 'young', 'middle', 'elderly'
  - `accent_description` (text, nullable) - Description of accent
  - `is_default` (boolean) - Whether this is default voice for language
  - `quality_score` (numeric, nullable) - Voice quality rating (0-5)
  - `model_id` (text) - ElevenLabs model ID (e.g., 'eleven_multilingual_v2')
  - `created_at` (timestamptz) - When mapping was created
  - `updated_at` (timestamptz) - When mapping was last updated

  ### `emergency_phrases_multilingual`
  Critical safety phrases in multiple languages for emergency detection
  - `id` (uuid, primary key) - Phrase identifier
  - `language_code` (text) - ISO 639-1 language code
  - `phrase_type` (text) - Type: 'help', 'pain', 'fall', 'confused', 'medication'
  - `phrase_text` (text) - The actual phrase
  - `phonetic_variations` (text[]) - Common pronunciation variations
  - `priority_level` (integer) - Urgency level 1-5 (5 = immediate emergency)
  - `response_action` (text) - What action to take when detected
  - `created_at` (timestamptz) - When phrase was added

  ## Updates to Existing Tables

  ### `users` table additions
  - `language_setup_completed` (boolean) - Whether user completed language setup
  - `detected_languages_history` (text[]) - Array of languages detected in conversations

  ## Security
  - RLS policies restrict users to their own language data
  - Family members can view language events for their elders
  - Organization staff can view residents' language preferences
  - Emergency phrase detection is globally accessible for safety

  ## Features Enabled
  - Automatic language detection during conversations
  - Seamless voice switching to detected language
  - Language usage analytics and insights
  - Emergency phrase detection in multiple languages
  - Cultural context awareness in responses
  - Family alerts on language pattern changes
  - Historical language usage tracking
*/

-- Add new columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'language_setup_completed'
  ) THEN
    ALTER TABLE users ADD COLUMN language_setup_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'detected_languages_history'
  ) THEN
    ALTER TABLE users ADD COLUMN detected_languages_history text[] DEFAULT ARRAY['en'];
  END IF;
END $$;

-- Create user_language_preferences table
CREATE TABLE IF NOT EXISTS user_language_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_language text NOT NULL DEFAULT 'en',
  primary_language_name text NOT NULL DEFAULT 'English',
  primary_dialect text,
  secondary_languages text[] DEFAULT ARRAY[]::text[],
  fluency_levels jsonb DEFAULT '{"en": "native"}'::jsonb,
  preferred_voice_id jsonb DEFAULT '{}'::jsonb,
  auto_detect_enabled boolean NOT NULL DEFAULT true,
  cultural_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_primary_language CHECK (char_length(primary_language) >= 2 AND char_length(primary_language) <= 10)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_primary ON user_language_preferences(primary_language);

-- Create conversation_language_events table
CREATE TABLE IF NOT EXISTS conversation_language_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  detected_language text NOT NULL,
  confidence_score numeric(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  previous_language text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('automatic', 'manual', 'emergency', 'family_request')),
  context text,
  emotional_state text CHECK (emotional_state IN ('calm', 'distressed', 'confused', 'agitated', 'happy', 'sad')),
  transcript_snippet text,
  duration_seconds integer CHECK (duration_seconds >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for conversation_language_events
CREATE INDEX IF NOT EXISTS idx_conversation_language_events_user ON conversation_language_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_language_events_language ON conversation_language_events(detected_language, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_language_events_emotional ON conversation_language_events(user_id, emotional_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_language_events_trigger ON conversation_language_events(trigger_type, created_at DESC);

-- Create language_voice_mappings table
CREATE TABLE IF NOT EXISTS language_voice_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  language_name text NOT NULL,
  dialect text,
  voice_id text NOT NULL,
  voice_name text NOT NULL,
  voice_gender text NOT NULL CHECK (voice_gender IN ('male', 'female', 'neutral')),
  voice_age_range text NOT NULL CHECK (voice_age_range IN ('young', 'middle', 'elderly')),
  accent_description text,
  is_default boolean NOT NULL DEFAULT false,
  quality_score numeric(2,1) CHECK (quality_score >= 0 AND quality_score <= 5),
  model_id text NOT NULL DEFAULT 'eleven_multilingual_v2',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(language_code, dialect, voice_id)
);

-- Create indexes for language_voice_mappings
CREATE INDEX IF NOT EXISTS idx_language_voice_mappings_code ON language_voice_mappings(language_code);
CREATE INDEX IF NOT EXISTS idx_language_voice_mappings_default ON language_voice_mappings(language_code, is_default) WHERE is_default = true;

-- Create emergency_phrases_multilingual table
CREATE TABLE IF NOT EXISTS emergency_phrases_multilingual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL,
  phrase_type text NOT NULL CHECK (phrase_type IN ('help', 'pain', 'fall', 'confused', 'medication', 'breathe', 'chest', 'dizzy')),
  phrase_text text NOT NULL,
  phonetic_variations text[] DEFAULT ARRAY[]::text[],
  priority_level integer NOT NULL CHECK (priority_level >= 1 AND priority_level <= 5),
  response_action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for emergency_phrases_multilingual
CREATE INDEX IF NOT EXISTS idx_emergency_phrases_language ON emergency_phrases_multilingual(language_code, phrase_type);
CREATE INDEX IF NOT EXISTS idx_emergency_phrases_priority ON emergency_phrases_multilingual(priority_level DESC);

-- Enable Row Level Security
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_language_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_voice_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_phrases_multilingual ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_language_preferences

CREATE POLICY "Users can view own language preferences"
  ON user_language_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own language preferences"
  ON user_language_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own language preferences"
  ON user_language_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NoKs can view language preferences of their elders
CREATE POLICY "NoKs can view elder language preferences"
  ON user_language_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- Organization staff can view resident language preferences
CREATE POLICY "Organization staff can view resident language preferences"
  ON user_language_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT resident_id
      FROM organization_residents
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for conversation_language_events

CREATE POLICY "Users can view own language events"
  ON conversation_language_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own language events"
  ON conversation_language_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- NoKs can view language events of their elders
CREATE POLICY "NoKs can view elder language events"
  ON conversation_language_events
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT elder_id
      FROM elder_nok_relationships
      WHERE nok_id = auth.uid()
    )
  );

-- Organization staff can view resident language events
CREATE POLICY "Organization staff can view resident language events"
  ON conversation_language_events
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT resident_id
      FROM organization_residents
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for language_voice_mappings (read-only for all authenticated users)

CREATE POLICY "Authenticated users can view voice mappings"
  ON language_voice_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for emergency_phrases_multilingual (read-only for all authenticated users for safety)

CREATE POLICY "Authenticated users can view emergency phrases"
  ON emergency_phrases_multilingual
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_language_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user_language_preferences
DROP TRIGGER IF EXISTS trigger_update_language_preferences_updated_at ON user_language_preferences;
CREATE TRIGGER trigger_update_language_preferences_updated_at
  BEFORE UPDATE ON user_language_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_language_preferences_updated_at();

-- Trigger to update updated_at on language_voice_mappings
DROP TRIGGER IF EXISTS trigger_update_language_voice_mappings_updated_at ON language_voice_mappings;
CREATE TRIGGER trigger_update_language_voice_mappings_updated_at
  BEFORE UPDATE ON language_voice_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_language_preferences_updated_at();

-- Function to initialize default language preferences for new users
CREATE OR REPLACE FUNCTION initialize_user_language_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_language_preferences (
    user_id,
    primary_language,
    primary_language_name,
    auto_detect_enabled
  )
  VALUES (
    NEW.id,
    'en',
    'English',
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create language preferences for new users
DROP TRIGGER IF EXISTS trigger_initialize_language_preferences ON auth.users;
CREATE TRIGGER trigger_initialize_language_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_language_preferences();

-- Insert default language voice mappings for common languages
INSERT INTO language_voice_mappings (language_code, language_name, voice_id, voice_name, voice_gender, voice_age_range, accent_description, is_default, model_id) VALUES
  ('en', 'English', 'EXAVITQu4vr4xnSDxMaL', 'Sarah (British)', 'female', 'elderly', 'British English, warm and clear', true, 'eleven_multilingual_v2'),
  ('en-US', 'English (American)', 'pNInz6obpgDQGcFmaJgB', 'Adam', 'male', 'middle', 'American English', false, 'eleven_multilingual_v2'),
  ('es', 'Spanish', 'onwK4e9ZLuTAKqWW03F9', 'Daniel', 'male', 'elderly', 'Spanish (Spain)', true, 'eleven_multilingual_v2'),
  ('fr', 'French', 'ThT5KcBeYPX3keUQqHPh', 'Dorothy', 'female', 'elderly', 'French', true, 'eleven_multilingual_v2'),
  ('de', 'German', 'yoZ06aMxZJJ28mfd3POQ', 'Sam', 'male', 'middle', 'German', true, 'eleven_multilingual_v2'),
  ('it', 'Italian', 'XB0fDUnXU5powFXDhCwa', 'Charlotte', 'female', 'middle', 'Italian', true, 'eleven_multilingual_v2'),
  ('pt', 'Portuguese', 'pqHfZKP75CvOlQylNhV4', 'Bill', 'male', 'elderly', 'Portuguese', true, 'eleven_multilingual_v2'),
  ('pl', 'Polish', 'EXAVITQu4vr4xnSDxMaL', 'Sarah', 'female', 'elderly', 'Polish accent', true, 'eleven_multilingual_v2'),
  ('hi', 'Hindi', 'pNInz6obpgDQGcFmaJgB', 'Adam', 'male', 'middle', 'Hindi', true, 'eleven_multilingual_v2'),
  ('zh', 'Chinese (Mandarin)', 'onwK4e9ZLuTAKqWW03F9', 'Daniel', 'male', 'middle', 'Mandarin', true, 'eleven_multilingual_v2'),
  ('ar', 'Arabic', 'ThT5KcBeYPX3keUQqHPh', 'Dorothy', 'female', 'middle', 'Arabic', true, 'eleven_multilingual_v2'),
  ('ur', 'Urdu', 'yoZ06aMxZJJ28mfd3POQ', 'Sam', 'male', 'middle', 'Urdu', true, 'eleven_multilingual_v2'),
  ('bn', 'Bengali', 'XB0fDUnXU5powFXDhCwa', 'Charlotte', 'female', 'middle', 'Bengali', true, 'eleven_multilingual_v2'),
  ('pa', 'Punjabi', 'pqHfZKP75CvOlQylNhV4', 'Bill', 'male', 'elderly', 'Punjabi', true, 'eleven_multilingual_v2')
ON CONFLICT (language_code, dialect, voice_id) DO NOTHING;

-- Insert common emergency phrases in multiple languages
INSERT INTO emergency_phrases_multilingual (language_code, phrase_type, phrase_text, phonetic_variations, priority_level, response_action) VALUES
  -- English
  ('en', 'help', 'help', ARRAY['help me', 'I need help', 'please help'], 5, 'alert_emergency_contacts'),
  ('en', 'pain', 'I have pain', ARRAY['it hurts', 'I am in pain', 'painful'], 4, 'alert_nurse_or_caregiver'),
  ('en', 'fall', 'I fell', ARRAY['I have fallen', 'I fell down', 'fallen'], 5, 'alert_emergency_services'),
  ('en', 'confused', 'I am confused', ARRAY['confused', 'do not understand', 'where am I'], 3, 'alert_family_member'),

  -- Spanish
  ('es', 'help', 'ayuda', ARRAY['ayúdame', 'necesito ayuda', 'por favor ayuda'], 5, 'alert_emergency_contacts'),
  ('es', 'pain', 'tengo dolor', ARRAY['me duele', 'dolor', 'doloroso'], 4, 'alert_nurse_or_caregiver'),
  ('es', 'fall', 'me caí', ARRAY['caída', 'me he caído'], 5, 'alert_emergency_services'),

  -- French
  ('fr', 'help', 'aide', ARRAY['aidez-moi', 'j''ai besoin d''aide', 's''il vous plaît aide'], 5, 'alert_emergency_contacts'),
  ('fr', 'pain', 'j''ai mal', ARRAY['douleur', 'ça fait mal'], 4, 'alert_nurse_or_caregiver'),
  ('fr', 'fall', 'je suis tombé', ARRAY['tombé', 'chute'], 5, 'alert_emergency_services'),

  -- German
  ('de', 'help', 'hilfe', ARRAY['hilf mir', 'ich brauche hilfe', 'bitte hilfe'], 5, 'alert_emergency_contacts'),
  ('de', 'pain', 'ich habe schmerzen', ARRAY['schmerz', 'tut weh'], 4, 'alert_nurse_or_caregiver'),
  ('de', 'fall', 'ich bin gefallen', ARRAY['gestürzt', 'sturz'], 5, 'alert_emergency_services'),

  -- Italian
  ('it', 'help', 'aiuto', ARRAY['aiutami', 'ho bisogno di aiuto', 'per favore aiuto'], 5, 'alert_emergency_contacts'),
  ('it', 'pain', 'ho dolore', ARRAY['mi fa male', 'dolore'], 4, 'alert_nurse_or_caregiver'),
  ('it', 'fall', 'sono caduto', ARRAY['caduto', 'caduta'], 5, 'alert_emergency_services'),

  -- Polish
  ('pl', 'help', 'pomoc', ARRAY['pomocy', 'potrzebuję pomocy', 'proszę pomoc'], 5, 'alert_emergency_contacts'),
  ('pl', 'pain', 'boli mnie', ARRAY['ból', 'boli'], 4, 'alert_nurse_or_caregiver'),
  ('pl', 'fall', 'upadłem', ARRAY['upadł', 'upadła', 'upadek'], 5, 'alert_emergency_services'),

  -- Hindi
  ('hi', 'help', 'मदद', ARRAY['मदद करो', 'मुझे मदद चाहिए', 'कृपया मदद करें'], 5, 'alert_emergency_contacts'),
  ('hi', 'pain', 'दर्द है', ARRAY['दर्द', 'दुख रहा है'], 4, 'alert_nurse_or_caregiver'),
  ('hi', 'fall', 'गिर गया', ARRAY['गिरा', 'गिरी'], 5, 'alert_emergency_services'),

  -- Urdu
  ('ur', 'help', 'مدد', ARRAY['مدد کریں', 'مجھے مدد چاہیے'], 5, 'alert_emergency_contacts'),
  ('ur', 'pain', 'درد ہے', ARRAY['درد', 'تکلیف'], 4, 'alert_nurse_or_caregiver'),
  ('ur', 'fall', 'گر گیا', ARRAY['گرا', 'گری'], 5, 'alert_emergency_services'),

  -- Arabic
  ('ar', 'help', 'مساعدة', ARRAY['ساعدني', 'أحتاج مساعدة'], 5, 'alert_emergency_contacts'),
  ('ar', 'pain', 'لدي ألم', ARRAY['ألم', 'يؤلمني'], 4, 'alert_nurse_or_caregiver'),
  ('ar', 'fall', 'سقطت', ARRAY['وقعت', 'سقوط'], 5, 'alert_emergency_services'),

  -- Punjabi
  ('pa', 'help', 'ਮਦਦ', ARRAY['ਮਦਦ ਕਰੋ', 'ਮੈਨੂੰ ਮਦਦ ਚਾਹੀਦੀ ਹੈ'], 5, 'alert_emergency_contacts'),
  ('pa', 'pain', 'ਦਰਦ ਹੈ', ARRAY['ਦਰਦ', 'ਦੁੱਖ'], 4, 'alert_nurse_or_caregiver'),
  ('pa', 'fall', 'ਡਿੱਗ ਗਿਆ', ARRAY['ਡਿੱਗਿਆ', 'ਡਿੱਗੀ'], 5, 'alert_emergency_services')
ON CONFLICT DO NOTHING;
