import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RegistrationData {
  name?: string;
  email?: string;
  timezone?: string;
  relationship?: string;
  phone?: string;
  elderName?: string;
  elderEmail?: string;
  elderTimezone?: string;
}

interface RequestBody {
  messages: ConversationMessage[];
  registrationType: "elder" | "nok";
  currentData?: RegistrationData;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const ELDER_SYSTEM_PROMPT = `You are Grace, a warm, patient, and compassionate AI assistant helping an elder person register for Grace Companion. You speak naturally and kindly, as if you're a caring friend.

Your goal is to collect the following information through natural conversation:
1. Their name
2. Their email address
3. Their timezone (automatically detected, just confirm it with them)

Guidelines:
- Speak warmly and patiently, using simple language
- Ask ONE question at a time
- Be encouraging and friendly
- If they give you information for multiple fields at once, that's great! Extract it all
- Validate email addresses gently (must contain @ and .)
- If they seem confused, rephrase gently and offer help
- Keep responses concise (2-3 sentences max)
- Never rush them
- Use natural, conversational language

When you have all required information, confirm everything with them before finishing.

Current data collected: {DATA}

Conversation state: {STATE}`;

const NOK_SYSTEM_PROMPT = `You are Grace, a warm, professional AI assistant helping a family member register their elderly relative for Grace Companion. You're understanding of the challenges of caring for someone with cognitive impairment.

Your goal is to collect information in this order:
1. Family member's name
2. Family member's email
3. Relationship to the elder (son, daughter, spouse, sibling, legal guardian, professional caregiver, other)
4. Family member's phone number (optional)
5. Elder's name
6. Elder's email (optional - they may not have one)
7. Elder's timezone (auto-detected, just confirm)

Guidelines:
- Be professional yet warm
- Ask ONE question at a time
- Acknowledge the care they're providing
- If they give multiple pieces of information at once, extract them all
- For relationship, accept natural variations (e.g., "I'm her son" = son)
- Make it clear the elder's email is optional
- Keep responses concise (2-3 sentences max)
- Be understanding and supportive

When you have all required information, confirm everything before finishing.

Current data collected: {DATA}

Conversation state: {STATE}`;

function determineConversationState(data: RegistrationData, type: "elder" | "nok"): string {
  if (type === "elder") {
    if (!data.name) return "GREETING_ASK_NAME";
    if (!data.email) return "ASK_EMAIL";
    if (!data.timezone) return "CONFIRM_TIMEZONE";
    return "CONFIRM_ALL";
  } else {
    if (!data.name) return "GREETING_ASK_NOK_NAME";
    if (!data.email) return "ASK_NOK_EMAIL";
    if (!data.relationship) return "ASK_RELATIONSHIP";
    if (data.phone === undefined) return "ASK_PHONE";
    if (!data.elderName) return "ASK_ELDER_NAME";
    if (data.elderEmail === undefined) return "ASK_ELDER_EMAIL";
    if (!data.elderTimezone) return "CONFIRM_ELDER_TIMEZONE";
    return "CONFIRM_ALL";
  }
}

function extractDataFromResponse(aiResponse: string, currentData: RegistrationData, userMessage: string): RegistrationData {
  const newData = { ...currentData };

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const emailMatch = userMessage.match(emailRegex);
  if (emailMatch && !newData.email && !newData.elderEmail) {
    if (!newData.name) {
      newData.email = emailMatch[0];
    } else if (newData.email && !newData.elderEmail) {
      newData.elderEmail = emailMatch[0];
    }
  }

  const namePatterns = [
    /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/,
  ];

  for (const pattern of namePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      if (!newData.name) {
        newData.name = match[1];
      } else if (newData.email && !newData.elderName) {
        newData.elderName = match[1];
      }
      break;
    }
  }

  const relationshipMap: Record<string, string> = {
    "son": "son",
    "daughter": "daughter",
    "spouse": "spouse",
    "husband": "spouse",
    "wife": "spouse",
    "brother": "sibling",
    "sister": "sibling",
    "sibling": "sibling",
    "guardian": "legal-guardian",
    "legal guardian": "legal-guardian",
    "caregiver": "caregiver",
    "carer": "caregiver",
  };

  const lowerMessage = userMessage.toLowerCase();
  for (const [key, value] of Object.entries(relationshipMap)) {
    if (lowerMessage.includes(key)) {
      newData.relationship = value;
      break;
    }
  }

  const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/;
  const phoneMatch = userMessage.match(phoneRegex);
  if (phoneMatch && newData.phone === undefined) {
    newData.phone = phoneMatch[1].trim();
  }

  if ((lowerMessage.includes("no phone") || lowerMessage.includes("don't have") || lowerMessage.includes("skip")) && newData.phone === undefined) {
    newData.phone = "";
  }

  if ((lowerMessage.includes("no email") || lowerMessage.includes("doesn't have") || lowerMessage.includes("don't have an email")) && newData.elderEmail === undefined) {
    newData.elderEmail = "";
  }

  return newData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, registrationType, currentData = {} }: RequestBody = await req.json();

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!currentData.timezone) {
      currentData.timezone = detectedTimezone;
    }
    if (registrationType === "nok" && !currentData.elderTimezone) {
      currentData.elderTimezone = detectedTimezone;
    }

    const conversationState = determineConversationState(currentData, registrationType);

    const systemPrompt = registrationType === "elder" ? ELDER_SYSTEM_PROMPT : NOK_SYSTEM_PROMPT;
    const filledPrompt = systemPrompt
      .replace("{DATA}", JSON.stringify(currentData, null, 2))
      .replace("{STATE}", conversationState);

    const aiMessages: ConversationMessage[] = [
      { role: "system", content: filledPrompt },
      ...messages,
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const updatedData = extractDataFromResponse(aiResponse, currentData, lastUserMessage);

    const isComplete = registrationType === "elder"
      ? !!(updatedData.name && updatedData.email && updatedData.timezone)
      : !!(updatedData.name && updatedData.email && updatedData.relationship &&
           updatedData.elderName && updatedData.elderTimezone);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        extractedData: updatedData,
        isComplete,
        conversationState,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in voice-conversation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});