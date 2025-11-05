export type BehaviorAction =
  | { type: 'remind'; taskId: string }
  | { type: 'notify_nok'; reason: string }
  | { type: 'emergency' }
  | { type: 'simple_response' };

export interface BehaviorResponse {
  replyText: string;
  selectedVoiceId?: string;
  voiceRole: 'reminder' | 'checkin' | 'general';
  actions: BehaviorAction[];
  sentiment: 'pos' | 'neu' | 'neg';
}

const HEALTH_KEYWORDS = [
  'dizzy', 'fall', 'fell', 'pain', 'hurt', 'nausea', 'sick', 'weak',
  'bleeding', 'chest', 'breathing', 'confused', 'emergency'
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
];

export function analyzeMessage(
  userMessage: string,
  upcomingTasks: Array<{ id: string; title: string; dueMinutes: number }> = []
): BehaviorResponse {
  const lowerMessage = userMessage.toLowerCase().trim();

  if (lowerMessage.includes('help') || lowerMessage.includes('emergency')) {
    return {
      replyText: "I'm here for you. I'm notifying your family right now. Help is on the way.",
      voiceRole: 'checkin',
      actions: [{ type: 'emergency' }],
      sentiment: 'neu',
    };
  }

  const hasHealthKeyword = HEALTH_KEYWORDS.some(keyword =>
    lowerMessage.includes(keyword)
  );

  if (hasHealthKeyword) {
    return {
      replyText: "I'm concerned about what you just said. Would you like me to contact your family to check on you? Please let me know if you need help.",
      voiceRole: 'checkin',
      actions: [{ type: 'notify_nok', reason: `Health concern: ${userMessage}` }],
      sentiment: 'neg',
    };
  }

  const urgentTask = upcomingTasks.find(task => task.dueMinutes <= 15);
  if (urgentTask) {
    return {
      replyText: `Before we continue, I wanted to remind you: ${urgentTask.title}. Would you like to mark this as done, or would you like more information?`,
      voiceRole: 'reminder',
      actions: [{ type: 'remind', taskId: urgentTask.id }],
      sentiment: 'neu',
    };
  }

  const isGreeting = GREETING_PATTERNS.some(pattern => pattern.test(userMessage));
  if (isGreeting) {
    return {
      replyText: "Hello! It's wonderful to hear from you. Would you like to hear your reminders, or would you like to chat about something?",
      voiceRole: 'general',
      actions: [{ type: 'simple_response' }],
      sentiment: 'pos',
    };
  }

  const positiveWords = ['good', 'great', 'wonderful', 'happy', 'fine', 'excellent'];
  const negativeWords = ['bad', 'sad', 'terrible', 'awful', 'worried', 'upset'];

  const hasPositive = positiveWords.some(word => lowerMessage.includes(word));
  const hasNegative = negativeWords.some(word => lowerMessage.includes(word));

  let sentiment: 'pos' | 'neu' | 'neg' = 'neu';
  let replyText = "I'm listening. Tell me more about that.";

  if (hasPositive) {
    sentiment = 'pos';
    replyText = "That's wonderful to hear! I'm so glad. Is there anything else you'd like to talk about?";
  } else if (hasNegative) {
    sentiment = 'neg';
    replyText = "I understand. Sometimes things can be difficult. Would you like to talk more about it, or would you like me to notify your family?";
  }

  return {
    replyText,
    voiceRole: 'general',
    actions: [{ type: 'simple_response' }],
    sentiment,
  };
}

export function analyzeSentiment(text: string): 'pos' | 'neu' | 'neg' {
  const lowerText = text.toLowerCase();

  const positiveWords = [
    'good', 'great', 'wonderful', 'happy', 'joy', 'love', 'excellent',
    'nice', 'beautiful', 'amazing', 'fantastic', 'delighted', 'pleased'
  ];

  const negativeWords = [
    'bad', 'sad', 'terrible', 'awful', 'hate', 'angry', 'upset',
    'worried', 'anxious', 'depressed', 'frustrated', 'pain', 'hurt'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return 'pos';
  if (negativeCount > positiveCount) return 'neg';
  return 'neu';
}
