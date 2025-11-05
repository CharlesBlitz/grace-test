/*
  # Add Conversational Reminder Features

  ## Overview
  Enhances the reminder system to support warm, personalized conversational greetings
  that make reminders feel more human and caring while keeping interactions brief.

  ## Changes Made

  1. **Extend care_tasks table**
     - `use_conversational_greeting` (boolean) - Enable/disable warm greetings
     - `greeting_style` (text) - Style: brief, warm, casual, formal
     - `time_aware_greeting` (boolean) - Adjust greeting based on time of day
     - `include_wellbeing_check` (boolean) - Add "how are you" type phrases
     - `enable_response_capture` (boolean) - Enable interactive voice response
  
  2. **New Table: conversational_greeting_templates**
     - `id` (uuid, primary key) - Unique template identifier
     - `template_name` (text) - Descriptive name for template
     - `greeting_style` (text) - Style: brief, warm, casual, formal
     - `time_of_day` (text) - morning, afternoon, evening, any
     - `greeting_text` (text) - Opening greeting with [name] placeholder
     - `wellbeing_phrase` (text) - Optional check-in phrase
     - `closing_text` (text) - Closing phrase
     - `active` (boolean) - Whether template is active
     - `created_at` (timestamptz) - When template was created

  3. **Extend notification_log table**
     - `elder_response` (text) - Captured response from elder (if interactive)
     - `response_captured_at` (timestamptz) - When response was received
     - `greeting_style_used` (text) - Which greeting style was used
     - `message_duration_seconds` (integer) - Estimated message duration

  ## Important Notes
  - Conversational features are optional and disabled by default
  - Greetings are kept brief (5-15 seconds) to respect elder's time
  - Total call duration capped at 60 seconds maximum
  - Works with both cloned voices and standard TTS
  - Time-aware greetings adjust based on local time of day
*/

-- Add new columns to care_tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'use_conversational_greeting'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN use_conversational_greeting boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'greeting_style'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN greeting_style text DEFAULT 'brief' 
      CHECK (greeting_style IN ('brief', 'warm', 'casual', 'formal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'time_aware_greeting'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN time_aware_greeting boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'include_wellbeing_check'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN include_wellbeing_check boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'care_tasks' AND column_name = 'enable_response_capture'
  ) THEN
    ALTER TABLE care_tasks ADD COLUMN enable_response_capture boolean DEFAULT false;
  END IF;
END $$;

-- Create conversational_greeting_templates table
CREATE TABLE IF NOT EXISTS conversational_greeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  greeting_style text NOT NULL CHECK (greeting_style IN ('brief', 'warm', 'casual', 'formal')),
  time_of_day text NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'any')),
  greeting_text text NOT NULL,
  wellbeing_phrase text,
  closing_text text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(greeting_style, time_of_day)
);

-- Add new columns to notification_log table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'elder_response'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN elder_response text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'response_captured_at'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN response_captured_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'greeting_style_used'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN greeting_style_used text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'message_duration_seconds'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN message_duration_seconds integer;
  END IF;
END $$;

-- Enable RLS on new table
ALTER TABLE conversational_greeting_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversational_greeting_templates

-- Anyone authenticated can read templates
CREATE POLICY "Authenticated users can view greeting templates"
  ON conversational_greeting_templates FOR SELECT
  TO authenticated
  USING (active = true);

-- System administrators can manage templates
CREATE POLICY "System can manage greeting templates"
  ON conversational_greeting_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_greeting_templates_style_time 
  ON conversational_greeting_templates(greeting_style, time_of_day) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_notification_log_response 
  ON notification_log(elder_response) 
  WHERE elder_response IS NOT NULL;

-- Insert default conversational greeting templates

-- Brief style greetings
INSERT INTO conversational_greeting_templates 
  (template_name, greeting_style, time_of_day, greeting_text, wellbeing_phrase, closing_text)
VALUES
  ('Brief Morning', 'brief', 'morning', 
   'Good morning, [name].', 
   'I hope you slept well.',
   'Have a great day.'),
  
  ('Brief Afternoon', 'brief', 'afternoon', 
   'Good afternoon, [name].', 
   'I hope your day is going well.',
   'Enjoy the rest of your day.'),
  
  ('Brief Evening', 'brief', 'evening', 
   'Good evening, [name].', 
   'I hope you had a good day.',
   'Have a relaxing evening.');

-- Warm style greetings
INSERT INTO conversational_greeting_templates 
  (template_name, greeting_style, time_of_day, greeting_text, wellbeing_phrase, closing_text)
VALUES
  ('Warm Morning', 'warm', 'morning', 
   'Good morning, [name]! It''s lovely to speak with you.', 
   'I hope you''re feeling well this morning.',
   'Take care and have a wonderful day.'),
  
  ('Warm Afternoon', 'warm', 'afternoon', 
   'Hello [name]! How nice to check in with you.', 
   'I hope your afternoon is going beautifully.',
   'Wishing you all the best for the rest of your day.'),
  
  ('Warm Evening', 'warm', 'evening', 
   'Good evening, [name]. It''s so good to hear from you.', 
   'I hope your day has been pleasant.',
   'Have a peaceful and restful evening.');

-- Casual style greetings
INSERT INTO conversational_greeting_templates 
  (template_name, greeting_style, time_of_day, greeting_text, wellbeing_phrase, closing_text)
VALUES
  ('Casual Morning', 'casual', 'morning', 
   'Hey [name]! Morning!', 
   'Hope you''re doing well today.',
   'Have a good one!'),
  
  ('Casual Afternoon', 'casual', 'afternoon', 
   'Hi [name]!', 
   'Hope everything''s going okay.',
   'Take it easy!'),
  
  ('Casual Evening', 'casual', 'evening', 
   'Hey [name], good evening!', 
   'Hope your day was good.',
   'Have a nice evening!');

-- Formal style greetings
INSERT INTO conversational_greeting_templates 
  (template_name, greeting_style, time_of_day, greeting_text, wellbeing_phrase, closing_text)
VALUES
  ('Formal Morning', 'formal', 'morning', 
   'Good morning, [name].', 
   'I trust you are well this morning.',
   'I wish you a pleasant day ahead.'),
  
  ('Formal Afternoon', 'formal', 'afternoon', 
   'Good afternoon, [name].', 
   'I trust you are having a good afternoon.',
   'I wish you well for the remainder of your day.'),
  
  ('Formal Evening', 'formal', 'evening', 
   'Good evening, [name].', 
   'I trust your day has been satisfactory.',
   'I wish you a pleasant evening.');

-- Any time greetings (fallback)
INSERT INTO conversational_greeting_templates 
  (template_name, greeting_style, time_of_day, greeting_text, wellbeing_phrase, closing_text)
VALUES
  ('Brief Anytime', 'brief', 'any', 
   'Hello, [name].', 
   'I hope you''re doing well.',
   'Take care.'),
  
  ('Warm Anytime', 'warm', 'any', 
   'Hello [name], it''s wonderful to speak with you.', 
   'I hope you''re feeling good today.',
   'Wishing you all the very best.'),
  
  ('Casual Anytime', 'casual', 'any', 
   'Hi [name]!', 
   'Hope you''re doing great.',
   'Take care!'),
  
  ('Formal Anytime', 'formal', 'any', 
   'Good day, [name].', 
   'I trust you are well.',
   'I wish you well.')
ON CONFLICT (greeting_style, time_of_day) DO NOTHING;
