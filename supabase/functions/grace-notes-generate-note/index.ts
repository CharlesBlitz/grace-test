import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateNoteRequest {
  visitNoteId: string;
  rawTranscript: string;
  clientContext?: {
    name: string;
    careType: string;
    riskLevel: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { visitNoteId, rawTranscript, clientContext }: GenerateNoteRequest = await req.json();

    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Raw transcript is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const systemPrompt = `You are an expert social care professional and clinical documentation specialist.
Your role is to transform informal visit notes into structured, professional documentation suitable for CQC inspections.

Generate comprehensive visit notes with these sections:
1. Physical Health Observations - any physical health concerns, mobility, pain, etc.
2. Mental Health & Wellbeing - mood, cognition, emotional state
3. Social Interactions - engagement, relationships, communication
4. Environmental Observations - home conditions, safety concerns
5. AI Summary - concise 2-3 sentence overview
6. Actions Taken - specific interventions or support provided
7. Follow-up Required - any concerns requiring action

Format as JSON with these keys:
{
  "physical_health_notes": "string",
  "mental_health_notes": "string",
  "social_notes": "string",
  "environmental_notes": "string",
  "ai_summary": "string",
  "actions_taken": ["array of strings"],
  "follow_up_required": boolean,
  "follow_up_notes": "string or null"
}

Guidelines:
- Be objective and factual
- Use person-centered language
- Note both strengths and concerns
- Flag safeguarding issues clearly
- Maintain professional tone
- Be concise but thorough`;

    const userPrompt = `Generate structured visit notes from this transcript:

${clientContext ? `Client: ${clientContext.name}
Care Type: ${clientContext.careType}
Risk Level: ${clientContext.riskLevel}
` : ''}
Transcript:
${rawTranscript}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const structuredNote = JSON.parse(openaiData.choices[0].message.content);

    return new Response(
      JSON.stringify({
        success: true,
        structuredNote,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating note:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate note",
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