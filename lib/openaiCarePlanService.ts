import { supabase } from './supabaseClient';

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

interface GenerateGoalsParams {
  conditions: string[];
  careLevel: string;
  assessmentData?: any;
  concerns?: string;
  organizationId: string;
}

interface GenerateTasksParams {
  goalName: string;
  goalDescription: string;
  goalCategory: string;
  careLevel: string;
  organizationId: string;
}

interface AnalyzeAssessmentParams {
  assessmentType: string;
  assessmentData: any;
  notes?: string;
  history?: string;
  organizationId: string;
}

interface StructureVoiceNotesParams {
  transcript: string;
  context?: string;
  sectionType: 'goal' | 'task' | 'assessment_notes' | 'recommendations' | 'care_plan_description';
  organizationId: string;
}

interface BestPracticeParams {
  question: string;
  context?: string;
  organizationId: string;
}

interface GenerateCarePlanDescriptionParams {
  residentName: string;
  conditions: string[];
  careLevel: string;
  concerns?: string;
  goalsSummary?: string;
  organizationId: string;
}

interface AIResponse {
  content: string;
  tokensUsed: number;
  responseTimeMs: number;
}

async function getPromptTemplate(templateType: string, organizationId: string) {
  const { data } = await supabase
    .from('ai_prompt_templates')
    .select('*')
    .eq('template_type', templateType)
    .eq('is_active', true)
    .or(`is_system_template.eq.true,organization_id.eq.${organizationId}`)
    .order('is_system_template', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}

function replacePlaceholders(template: string, values: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    const replacement = Array.isArray(value) ? value.join(', ') : String(value || '');
    result = result.replace(new RegExp(placeholder, 'g'), replacement);
  }
  return result;
}

async function callOpenAI(
  systemMessage: string,
  userMessage: string,
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<AIResponse> {
  const startTime = Date.now();

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const responseTimeMs = Date.now() - startTime;

  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage?.total_tokens || 0,
    responseTimeMs,
  };
}

async function logAnalytics(
  organizationId: string,
  userId: string,
  actionType: string,
  suggestionType: string | null,
  tokensUsed: number,
  responseTimeMs: number,
  metadata: any = {}
) {
  try {
    await supabase.from('ai_care_plan_analytics').insert({
      organization_id: organizationId,
      user_id: userId,
      action_type: actionType,
      suggestion_type: suggestionType,
      tokens_used: tokensUsed,
      response_time_ms: responseTimeMs,
      metadata,
    });
  } catch (error) {
    console.error('Failed to log AI analytics:', error);
  }
}

export async function generateCareGoals(
  params: GenerateGoalsParams,
  userId: string
): Promise<{ goals: any[]; suggestionId: string }> {
  const template = await getPromptTemplate('goal_generation', params.organizationId);

  if (!template) {
    throw new Error('Goal generation template not found');
  }

  const userMessage = replacePlaceholders(template.prompt_template, {
    conditions: params.conditions,
    care_level: params.careLevel,
    assessment_data: JSON.stringify(params.assessmentData || {}),
    concerns: params.concerns || 'None specified',
  });

  const aiResponse = await callOpenAI(template.system_message, userMessage, 0.7, 1500);

  await logAnalytics(
    params.organizationId,
    userId,
    'suggestion_requested',
    'goal',
    aiResponse.tokensUsed,
    aiResponse.responseTimeMs
  );

  const goals = parseGoalsFromAI(aiResponse.content);

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .insert({
      organization_id: params.organizationId,
      suggestion_type: 'goal',
      input_data: params,
      ai_suggestion: { goals, raw_response: aiResponse.content },
      created_by: userId,
    })
    .select()
    .single();

  return {
    goals,
    suggestionId: suggestion?.id || '',
  };
}

export async function generateCareTasks(
  params: GenerateTasksParams,
  userId: string
): Promise<{ tasks: any[]; suggestionId: string }> {
  const template = await getPromptTemplate('task_generation', params.organizationId);

  if (!template) {
    throw new Error('Task generation template not found');
  }

  const userMessage = replacePlaceholders(template.prompt_template, {
    goal_name: params.goalName,
    goal_description: params.goalDescription,
    goal_category: params.goalCategory,
    care_level: params.careLevel,
  });

  const aiResponse = await callOpenAI(template.system_message, userMessage, 0.7, 1000);

  await logAnalytics(
    params.organizationId,
    userId,
    'suggestion_requested',
    'task',
    aiResponse.tokensUsed,
    aiResponse.responseTimeMs
  );

  const tasks = parseTasksFromAI(aiResponse.content);

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .insert({
      organization_id: params.organizationId,
      suggestion_type: 'task',
      input_data: params,
      ai_suggestion: { tasks, raw_response: aiResponse.content },
      created_by: userId,
    })
    .select()
    .single();

  return {
    tasks,
    suggestionId: suggestion?.id || '',
  };
}

export async function analyzeAssessment(
  params: AnalyzeAssessmentParams,
  userId: string
): Promise<{ analysis: any; suggestionId: string }> {
  const template = await getPromptTemplate('assessment_analysis', params.organizationId);

  if (!template) {
    throw new Error('Assessment analysis template not found');
  }

  const userMessage = replacePlaceholders(template.prompt_template, {
    assessment_type: params.assessmentType,
    assessment_data: JSON.stringify(params.assessmentData),
    notes: params.notes || 'None',
    history: params.history || 'Not available',
  });

  const aiResponse = await callOpenAI(template.system_message, userMessage, 0.6, 1500);

  await logAnalytics(
    params.organizationId,
    userId,
    'suggestion_requested',
    'assessment_notes',
    aiResponse.tokensUsed,
    aiResponse.responseTimeMs
  );

  const analysis = parseAssessmentAnalysis(aiResponse.content);

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .insert({
      organization_id: params.organizationId,
      suggestion_type: 'assessment_notes',
      input_data: params,
      ai_suggestion: { analysis, raw_response: aiResponse.content },
      created_by: userId,
    })
    .select()
    .single();

  return {
    analysis,
    suggestionId: suggestion?.id || '',
  };
}

export async function structureVoiceNotes(
  params: StructureVoiceNotesParams,
  userId: string
): Promise<{ structuredText: string; suggestionId: string }> {
  const template = await getPromptTemplate('voice_structuring', params.organizationId);

  if (!template) {
    throw new Error('Voice structuring template not found');
  }

  const userMessage = replacePlaceholders(template.prompt_template, {
    transcript: params.transcript,
    context: params.context || '',
    section_type: params.sectionType,
  });

  const aiResponse = await callOpenAI(template.system_message, userMessage, 0.5, 800);

  await logAnalytics(
    params.organizationId,
    userId,
    'voice_dictation',
    params.sectionType,
    aiResponse.tokensUsed,
    aiResponse.responseTimeMs
  );

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .insert({
      organization_id: params.organizationId,
      suggestion_type: 'voice_transcription',
      input_data: params,
      ai_suggestion: { structured_text: aiResponse.content },
      created_by: userId,
    })
    .select()
    .single();

  return {
    structuredText: aiResponse.content,
    suggestionId: suggestion?.id || '',
  };
}

export async function getBestPracticeGuidance(
  params: BestPracticeParams,
  userId: string
): Promise<{ guidance: string; suggestionId: string }> {
  const template = await getPromptTemplate('best_practice', params.organizationId);

  if (!template) {
    throw new Error('Best practice template not found');
  }

  const userMessage = replacePlaceholders(template.prompt_template, {
    question: params.question,
    context: params.context || '',
  });

  const aiResponse = await callOpenAI(template.system_message, userMessage, 0.7, 1200);

  await logAnalytics(
    params.organizationId,
    userId,
    'best_practice_query',
    'best_practice_answer',
    aiResponse.tokensUsed,
    aiResponse.responseTimeMs
  );

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .insert({
      organization_id: params.organizationId,
      suggestion_type: 'best_practice_answer',
      input_data: params,
      ai_suggestion: { guidance: aiResponse.content },
      created_by: userId,
    })
    .select()
    .single();

  return {
    guidance: aiResponse.content,
    suggestionId: suggestion?.id || '',
  };
}

export async function generateCarePlanDescription(
  params: GenerateCarePlanDescriptionParams,
  userId: string
): Promise<{ description: string; suggestionId: string }> {
  const template = await getPromptTemplate('care_plan_description', params.organizationId);

  if (!template) {
    throw new Error('Care plan description template not found');
  }

  const userMessage = replacePlaceholders(template.prompt_template, {
    resident_name: params.residentName,
    conditions: params.conditions,
    care_level: params.careLevel,
    concerns: params.concerns || 'None specified',
    goals_summary: params.goalsSummary || 'To be defined',
  });

  const aiResponse = await callOpenAI(template.system_message, userMessage, 0.7, 600);

  await logAnalytics(
    params.organizationId,
    userId,
    'suggestion_requested',
    'care_plan_description',
    aiResponse.tokensUsed,
    aiResponse.responseTimeMs
  );

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .insert({
      organization_id: params.organizationId,
      suggestion_type: 'care_plan_description',
      input_data: params,
      ai_suggestion: { description: aiResponse.content },
      created_by: userId,
    })
    .select()
    .single();

  return {
    description: aiResponse.content,
    suggestionId: suggestion?.id || '',
  };
}

export async function regenerateSuggestion(
  suggestionId: string,
  userId: string
): Promise<any> {
  const { data: originalSuggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (!originalSuggestion) {
    throw new Error('Original suggestion not found');
  }

  await supabase
    .from('ai_care_plan_suggestions')
    .update({
      status: 'regenerated',
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  const inputData = originalSuggestion.input_data;
  const orgId = originalSuggestion.organization_id;

  let result;
  switch (originalSuggestion.suggestion_type) {
    case 'goal':
      result = await generateCareGoals(inputData, userId);
      break;
    case 'task':
      result = await generateCareTasks(inputData, userId);
      break;
    case 'assessment_notes':
      result = await analyzeAssessment(inputData, userId);
      break;
    case 'voice_transcription':
      result = await structureVoiceNotes(inputData, userId);
      break;
    case 'best_practice_answer':
      result = await getBestPracticeGuidance(inputData, userId);
      break;
    case 'care_plan_description':
      result = await generateCarePlanDescription(inputData, userId);
      break;
    default:
      throw new Error('Unsupported suggestion type for regeneration');
  }

  await supabase
    .from('ai_care_plan_suggestions')
    .update({
      parent_suggestion_id: suggestionId,
      regeneration_count: (originalSuggestion.regeneration_count || 0) + 1,
    })
    .eq('id', result.suggestionId);

  await logAnalytics(
    orgId,
    userId,
    'suggestion_regenerated',
    originalSuggestion.suggestion_type,
    0,
    0
  );

  return result;
}

export async function acceptSuggestion(
  suggestionId: string,
  editedVersion?: any
): Promise<void> {
  await supabase
    .from('ai_care_plan_suggestions')
    .update({
      status: editedVersion ? 'edited' : 'accepted',
      edited_version: editedVersion || null,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .select('organization_id, created_by, suggestion_type')
    .eq('id', suggestionId)
    .single();

  if (suggestion) {
    await logAnalytics(
      suggestion.organization_id,
      suggestion.created_by,
      'suggestion_accepted',
      suggestion.suggestion_type,
      0,
      0
    );
  }
}

export async function rejectSuggestion(suggestionId: string): Promise<void> {
  await supabase
    .from('ai_care_plan_suggestions')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  const { data: suggestion } = await supabase
    .from('ai_care_plan_suggestions')
    .select('organization_id, created_by, suggestion_type')
    .eq('id', suggestionId)
    .single();

  if (suggestion) {
    await logAnalytics(
      suggestion.organization_id,
      suggestion.created_by,
      'suggestion_rejected',
      suggestion.suggestion_type,
      0,
      0
    );
  }
}

function parseGoalsFromAI(aiResponse: string): any[] {
  const goals = [];
  const lines = aiResponse.split('\n').filter(line => line.trim());

  let currentGoal: any = null;

  for (const line of lines) {
    if (line.match(/^-\s+Goal name:|^Goal \d+:|^\d+\./i)) {
      if (currentGoal) {
        goals.push(currentGoal);
      }
      currentGoal = {
        name: line.replace(/^-\s+Goal name:|^Goal \d+:|^\d+\./, '').replace(/:/g, '').trim(),
        description: '',
        category: 'health',
        priority: 'medium',
        target_date: '',
      };
    } else if (currentGoal) {
      if (line.match(/description:/i)) {
        currentGoal.description = line.replace(/.*description:/i, '').trim();
      } else if (line.match(/category:/i)) {
        const category = line.replace(/.*category:/i, '').trim().toLowerCase();
        if (['health', 'cognitive', 'mobility', 'social', 'nutrition', 'medication'].includes(category)) {
          currentGoal.category = category;
        }
      } else if (line.match(/priority:/i)) {
        const priority = line.replace(/.*priority:/i, '').trim().toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(priority)) {
          currentGoal.priority = priority;
        }
      }
    }
  }

  if (currentGoal) {
    goals.push(currentGoal);
  }

  return goals.length > 0 ? goals : [{
    name: 'Improve overall well-being',
    description: aiResponse,
    category: 'health',
    priority: 'medium',
    target_date: '',
  }];
}

function parseTasksFromAI(aiResponse: string): any[] {
  const tasks = [];
  const lines = aiResponse.split('\n').filter(line => line.trim());

  let currentTask: any = null;

  for (const line of lines) {
    if (line.match(/^-\s+Task name:|^Task \d+:|^\d+\./i)) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      currentTask = {
        name: line.replace(/^-\s+Task name:|^Task \d+:|^\d+\./, '').replace(/:/g, '').trim(),
        description: '',
        task_type: 'activity',
        frequency: 'daily',
        time_of_day: '09:00',
      };
    } else if (currentTask) {
      if (line.match(/description:/i)) {
        currentTask.description = line.replace(/.*description:/i, '').trim();
      } else if (line.match(/type:/i)) {
        const type = line.replace(/.*type:/i, '').trim().toLowerCase();
        if (['medication', 'hygiene', 'activity', 'therapy', 'assessment', 'nutrition'].includes(type)) {
          currentTask.task_type = type;
        }
      } else if (line.match(/frequency:/i)) {
        const freq = line.replace(/.*frequency:/i, '').trim().toLowerCase().replace(/\s+/g, '_');
        if (['daily', 'twice_daily', 'weekly', 'biweekly', 'monthly'].includes(freq)) {
          currentTask.frequency = freq;
        }
      } else if (line.match(/time:/i)) {
        currentTask.time_of_day = line.replace(/.*time:/i, '').trim();
      }
    }
  }

  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks.length > 0 ? tasks : [{
    name: 'Support care goal',
    description: aiResponse,
    task_type: 'activity',
    frequency: 'daily',
    time_of_day: '09:00',
  }];
}

function parseAssessmentAnalysis(aiResponse: string): any {
  return {
    raw_analysis: aiResponse,
    key_findings: extractSection(aiResponse, 'key findings'),
    concerns: extractSection(aiResponse, 'concerns'),
    improvements: extractSection(aiResponse, 'improvement'),
    recommendations: extractSection(aiResponse, 'recommendations'),
    follow_up: extractSection(aiResponse, 'follow-up'),
  };
}

function extractSection(text: string, sectionName: string): string[] {
  const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\n|\\d+\\.|$)`, 'is');
  const match = text.match(regex);

  if (match) {
    return match[1]
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  return [];
}

export async function saveDraft(
  organizationId: string,
  userId: string,
  draftType: string,
  draftData: any,
  relatedId?: string,
  voiceTranscript?: string
): Promise<void> {
  const { data: existingDraft } = await supabase
    .from('care_plan_drafts')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('draft_type', draftType)
    .eq('related_id', relatedId || '')
    .maybeSingle();

  if (existingDraft) {
    await supabase
      .from('care_plan_drafts')
      .update({
        draft_data: draftData,
        voice_transcript: voiceTranscript || null,
        last_saved_at: new Date().toISOString(),
      })
      .eq('id', existingDraft.id);
  } else {
    await supabase.from('care_plan_drafts').insert({
      organization_id: organizationId,
      user_id: userId,
      draft_type: draftType,
      related_id: relatedId || null,
      draft_data: draftData,
      voice_transcript: voiceTranscript || null,
    });
  }
}

export async function loadDraft(
  organizationId: string,
  userId: string,
  draftType: string,
  relatedId?: string
): Promise<any> {
  const { data } = await supabase
    .from('care_plan_drafts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('draft_type', draftType)
    .eq('related_id', relatedId || '')
    .maybeSingle();

  return data;
}

export async function deleteDraft(draftId: string): Promise<void> {
  await supabase.from('care_plan_drafts').delete().eq('id', draftId);
}
