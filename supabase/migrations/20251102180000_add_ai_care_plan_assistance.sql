/*
  # Add AI Care Plan Assistance System

  1. New Tables
    - `ai_care_plan_suggestions`
      - Tracks AI-generated suggestions for care plans
      - Records acceptance, rejection, and regeneration
      - Links to care plans, goals, tasks, and assessments

    - `care_plan_drafts`
      - Auto-saves voice-dictated and AI-assisted content
      - Prevents data loss during form filling
      - Version control for care plan edits

    - `ai_prompt_templates`
      - Reusable prompt templates for different care plan components
      - Organization-customizable prompts
      - Best practice guidelines built-in

  2. Security
    - Enable RLS on all tables
    - Only authenticated staff can create/view suggestions
    - Organization-scoped access control
    - Staff can only access their organization's data

  3. Features
    - Track AI suggestion acceptance rates
    - Store voice transcripts with structured output
    - Audit trail for AI-assisted care plans
    - Support regeneration and iteration
*/

-- AI Care Plan Suggestions table
CREATE TABLE IF NOT EXISTS ai_care_plan_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  care_plan_id uuid REFERENCES care_plans(id),
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('goal', 'task', 'assessment_notes', 'recommendations', 'care_plan_description', 'voice_transcription', 'best_practice_answer')),
  input_data jsonb NOT NULL DEFAULT '{}',
  ai_suggestion jsonb NOT NULL,
  edited_version jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'edited', 'regenerated')),
  regeneration_count integer DEFAULT 0,
  parent_suggestion_id uuid REFERENCES ai_care_plan_suggestions(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Care Plan Drafts table for autosaving
CREATE TABLE IF NOT EXISTS care_plan_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  draft_type text NOT NULL CHECK (draft_type IN ('new_care_plan', 'edit_care_plan', 'assessment', 'goal', 'task')),
  related_id uuid,
  draft_data jsonb NOT NULL DEFAULT '{}',
  voice_transcript text,
  last_saved_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- AI Prompt Templates table
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('goal_generation', 'task_generation', 'assessment_analysis', 'voice_structuring', 'best_practice', 'care_plan_description')),
  prompt_template text NOT NULL,
  system_message text NOT NULL,
  is_system_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  parameters jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Usage Analytics table
CREATE TABLE IF NOT EXISTS ai_care_plan_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL CHECK (action_type IN ('suggestion_requested', 'suggestion_accepted', 'suggestion_rejected', 'suggestion_regenerated', 'voice_dictation', 'best_practice_query')),
  suggestion_type text,
  tokens_used integer DEFAULT 0,
  response_time_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_care_plan ON ai_care_plan_suggestions(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org ON ai_care_plan_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_care_plan_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_care_plan_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_care_plan_drafts_user ON care_plan_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_drafts_org ON care_plan_drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_drafts_expires ON care_plan_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_templates_org ON ai_prompt_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_templates_type ON ai_prompt_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_org ON ai_care_plan_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_user ON ai_care_plan_analytics(user_id);

-- Enable RLS
ALTER TABLE ai_care_plan_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_care_plan_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_care_plan_suggestions
CREATE POLICY "Staff can view organization AI suggestions"
  ON ai_care_plan_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_care_plan_suggestions.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('nurse', 'care_coordinator', 'organization_admin')
    )
  );

CREATE POLICY "Staff can create AI suggestions"
  ON ai_care_plan_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_care_plan_suggestions.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('nurse', 'care_coordinator', 'organization_admin')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Staff can update own AI suggestions"
  ON ai_care_plan_suggestions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for care_plan_drafts
CREATE POLICY "Users can view own drafts"
  ON care_plan_drafts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own drafts"
  ON care_plan_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own drafts"
  ON care_plan_drafts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own drafts"
  ON care_plan_drafts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for ai_prompt_templates
CREATE POLICY "Staff can view templates"
  ON ai_prompt_templates FOR SELECT
  TO authenticated
  USING (
    is_system_template = true
    OR EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_prompt_templates.organization_id
      AND organization_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create templates"
  ON ai_prompt_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_prompt_templates.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role = 'organization_admin'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can update templates"
  ON ai_prompt_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_prompt_templates.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role = 'organization_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_prompt_templates.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role = 'organization_admin'
    )
  );

-- RLS Policies for ai_care_plan_analytics
CREATE POLICY "Staff can view organization analytics"
  ON ai_care_plan_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = ai_care_plan_analytics.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role IN ('care_coordinator', 'organization_admin')
    )
  );

CREATE POLICY "System can insert analytics"
  ON ai_care_plan_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to cleanup expired drafts
CREATE OR REPLACE FUNCTION cleanup_expired_care_plan_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM care_plan_drafts
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert system prompt templates
INSERT INTO ai_prompt_templates (template_name, template_type, prompt_template, system_message, is_system_template) VALUES
(
  'Generate Care Goals',
  'goal_generation',
  'Based on the following resident information and assessment data, generate 3-5 specific, measurable care goals:

Resident Conditions: {{conditions}}
Care Level: {{care_level}}
Recent Assessment: {{assessment_data}}
Current Concerns: {{concerns}}

Generate goals in the following format:
- Goal name (brief, clear)
- Detailed description
- Category (health, cognitive, mobility, social, nutrition, medication)
- Priority (low, medium, high, critical)
- Suggested target timeframe',
  'You are an expert care plan coordinator with 20+ years of experience in senior care. Generate evidence-based, person-centered care goals that are specific, measurable, achievable, relevant, and time-bound (SMART). Consider the individual''s dignity, preferences, and quality of life.',
  true
),
(
  'Generate Care Tasks',
  'task_generation',
  'Based on the following care goal, generate specific daily tasks that support achieving this goal:

Goal: {{goal_name}}
Goal Description: {{goal_description}}
Goal Category: {{goal_category}}
Resident Care Level: {{care_level}}

Generate 2-4 specific tasks in the following format:
- Task name
- Description with clear instructions
- Task type (medication, hygiene, activity, therapy, assessment, nutrition)
- Frequency (daily, twice_daily, weekly, biweekly, monthly)
- Recommended time of day',
  'You are an expert in senior care operations. Generate practical, achievable daily tasks that directly support care goals. Tasks should be clear enough for any trained caregiver to execute consistently. Consider resident safety, dignity, and quality of life.',
  true
),
(
  'Analyze Assessment',
  'assessment_analysis',
  'Analyze the following assessment data and provide clinical insights and recommendations:

Assessment Type: {{assessment_type}}
Assessment Data: {{assessment_data}}
Assessment Notes: {{notes}}
Resident History: {{history}}

Provide:
1. Key findings (3-5 bullet points)
2. Areas of concern
3. Areas of improvement
4. Specific recommendations for care plan adjustments
5. Suggested follow-up assessments or interventions',
  'You are a clinical expert specializing in geriatric care. Analyze assessment data with a focus on identifying trends, potential risks, and opportunities for improved care. Your recommendations should be evidence-based and actionable.',
  true
),
(
  'Structure Voice Notes',
  'voice_structuring',
  'Clean up and structure the following voice-transcribed notes into professional care plan documentation:

Voice Transcript: {{transcript}}
Context: {{context}}
Section Type: {{section_type}}

Structure the content appropriately for the section type (goal, task, assessment notes, recommendations, or care plan description). Correct grammar, remove filler words, and organize information logically while preserving all clinical details.',
  'You are a medical documentation specialist. Transform voice-dictated notes into clear, professional care plan documentation. Maintain clinical accuracy, use appropriate medical terminology, and ensure the content is well-organized and easy to read.',
  true
),
(
  'Best Practice Guidance',
  'best_practice',
  'Provide evidence-based best practice guidance for the following care planning question:

Question: {{question}}
Context: {{context}}

Provide:
1. Direct answer to the question
2. Evidence-based best practices
3. Practical implementation tips
4. Common pitfalls to avoid
5. Relevant resources or guidelines

Keep the response conversational, supportive, and actionable.',
  'You are a senior care consultant and educator with expertise in evidence-based care practices. Provide practical, actionable guidance that helps care staff deliver high-quality, person-centered care. Reference current best practices and guidelines when relevant.',
  true
),
(
  'Care Plan Description',
  'care_plan_description',
  'Generate a comprehensive care plan description based on the following information:

Resident Name: {{resident_name}}
Conditions: {{conditions}}
Care Level: {{care_level}}
Key Concerns: {{concerns}}
Goals Summary: {{goals_summary}}

Write a clear, compassionate overview that explains the overall approach and philosophy of this care plan. The description should be appropriate for sharing with family members and the care team.',
  'You are an expert care plan coordinator. Write care plan descriptions that are professional yet compassionate, clear yet comprehensive. The description should help anyone understand the resident''s needs and the care approach at a glance.',
  true
);
