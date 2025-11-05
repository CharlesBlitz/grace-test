/**
 * Conversational Greeting Service
 *
 * Generates warm, personalized greeting messages for voice reminders
 * that make interactions feel more human and caring while keeping them brief.
 */

export interface GreetingTemplate {
  id: string;
  template_name: string;
  greeting_style: 'brief' | 'warm' | 'casual' | 'formal';
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'any';
  greeting_text: string;
  wellbeing_phrase: string | null;
  closing_text: string | null;
  active: boolean;
}

export interface ConversationalMessageOptions {
  elderName: string;
  reminderMessage: string;
  greetingStyle: 'brief' | 'warm' | 'casual' | 'formal';
  timeAware: boolean;
  includeWellbeingCheck: boolean;
  enableResponseCapture: boolean;
}

export interface GeneratedMessage {
  fullMessage: string;
  estimatedDurationSeconds: number;
  greetingStyleUsed: string;
  twimlForInteractive?: string;
}

/**
 * Determines the appropriate time of day category based on current hour
 */
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

/**
 * Estimates message duration in seconds
 * Average speaking rate: ~150 words per minute = 2.5 words per second
 */
export function estimateMessageDuration(message: string): number {
  const wordCount = message.split(/\s+/).length;
  const baseSeconds = Math.ceil(wordCount / 2.5);

  // Add buffer for natural pauses
  const pauseBuffer = 3;
  return Math.min(baseSeconds + pauseBuffer, 60);
}

/**
 * Fetches greeting template from database
 */
export async function fetchGreetingTemplate(
  supabaseClient: any,
  style: string,
  timeOfDay: string
): Promise<GreetingTemplate | null> {
  try {
    // Try to get time-specific template
    const { data, error } = await supabaseClient
      .from('conversational_greeting_templates')
      .select('*')
      .eq('greeting_style', style)
      .eq('time_of_day', timeOfDay)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    // Fallback to 'any' time template
    const { data: fallbackData } = await supabaseClient
      .from('conversational_greeting_templates')
      .select('*')
      .eq('greeting_style', style)
      .eq('time_of_day', 'any')
      .eq('active', true)
      .maybeSingle();

    return fallbackData;
  } catch (error) {
    console.error('Error fetching greeting template:', error);
    return null;
  }
}

/**
 * Generates a conversational message with greeting and closing
 */
export async function generateConversationalMessage(
  supabaseClient: any,
  options: ConversationalMessageOptions
): Promise<GeneratedMessage> {
  const {
    elderName,
    reminderMessage,
    greetingStyle,
    timeAware,
    includeWellbeingCheck,
    enableResponseCapture
  } = options;

  const timeOfDay = timeAware ? getTimeOfDay() : 'any';

  // Fetch appropriate greeting template
  const template = await fetchGreetingTemplate(supabaseClient, greetingStyle, timeOfDay);

  // Build message parts
  const parts: string[] = [];

  if (template) {
    // Add greeting
    const greeting = template.greeting_text.replace('[name]', elderName);
    parts.push(greeting);

    // Add wellbeing check if enabled
    if (includeWellbeingCheck && template.wellbeing_phrase) {
      parts.push(template.wellbeing_phrase);
    }

    // Add reminder
    parts.push(`This is a reminder: ${reminderMessage}`);

    // Add closing
    if (template.closing_text) {
      parts.push(template.closing_text);
    }
  } else {
    // Fallback to simple message if template not found
    parts.push(`Hi ${elderName}, this is a reminder: ${reminderMessage}`);
  }

  const fullMessage = parts.join(' ');
  const estimatedDuration = estimateMessageDuration(fullMessage);

  // Generate TwiML for interactive response if enabled
  let twimlForInteractive: string | undefined;
  if (enableResponseCapture) {
    twimlForInteractive = generateInteractiveTwiML(fullMessage);
  }

  return {
    fullMessage,
    estimatedDurationSeconds: estimatedDuration,
    greetingStyleUsed: greetingStyle,
    twimlForInteractive
  };
}

/**
 * Generates TwiML with interactive voice response
 */
export function generateInteractiveTwiML(message: string): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Gather numDigits="1" timeout="5" action="/api/reminder-response">
    <Say voice="Polly.Joanna">If you're doing well, press 1. If you need assistance, press 2.</Say>
  </Gather>
  <Say voice="Polly.Joanna">Thank you. Take care.</Say>
</Response>`;

  return twiml;
}

/**
 * Escapes XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates a simple conversational message without database lookup
 * Useful for testing or when database is unavailable
 */
export function createSimpleConversationalMessage(
  elderName: string,
  reminderMessage: string,
  style: 'brief' | 'warm' | 'casual' | 'formal' = 'brief'
): GeneratedMessage {
  let greeting: string;
  let wellbeing: string;
  let closing: string;

  const timeOfDay = getTimeOfDay();
  const timeGreeting = timeOfDay === 'morning' ? 'Good morning' :
                       timeOfDay === 'afternoon' ? 'Good afternoon' :
                       'Good evening';

  switch (style) {
    case 'warm':
      greeting = `${timeGreeting}, ${elderName}! It's lovely to speak with you.`;
      wellbeing = 'I hope you\'re feeling well.';
      closing = 'Take care and have a wonderful day.';
      break;
    case 'casual':
      greeting = `Hey ${elderName}!`;
      wellbeing = 'Hope you\'re doing great.';
      closing = 'Have a good one!';
      break;
    case 'formal':
      greeting = `${timeGreeting}, ${elderName}.`;
      wellbeing = 'I trust you are well.';
      closing = 'I wish you well.';
      break;
    default: // brief
      greeting = `${timeGreeting}, ${elderName}.`;
      wellbeing = 'I hope you\'re doing well.';
      closing = 'Take care.';
  }

  const fullMessage = `${greeting} ${wellbeing} This is a reminder: ${reminderMessage} ${closing}`;

  return {
    fullMessage,
    estimatedDurationSeconds: estimateMessageDuration(fullMessage),
    greetingStyleUsed: style
  };
}

/**
 * Validates that message duration is within acceptable limits
 */
export function validateMessageDuration(durationSeconds: number): boolean {
  const MAX_DURATION = 60; // 60 seconds maximum
  const MIN_DURATION = 5;  // 5 seconds minimum

  return durationSeconds >= MIN_DURATION && durationSeconds <= MAX_DURATION;
}
