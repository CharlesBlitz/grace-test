import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerationRequest {
  interactionId: string;
  organizationId: string;
  residentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: GenerationRequest = await req.json();
    const { interactionId, organizationId, residentId } = body;

    const { data: orgUser } = await supabase
      .from("organization_users")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!orgUser) {
      throw new Error("Unauthorized: User not in organization");
    }

    const { data: interaction, error: interactionError } = await supabase
      .from("care_interaction_logs")
      .select("*")
      .eq("id", interactionId)
      .maybeSingle();

    if (interactionError || !interaction) {
      throw new Error("Interaction not found");
    }

    const { data: resident } = await supabase
      .from("users")
      .select("name, date_of_birth, metadata")
      .eq("id", residentId)
      .maybeSingle();

    const residentName = resident?.name || "Unknown Resident";
    const residentAge = resident?.date_of_birth
      ? Math.floor(
          (Date.now() - new Date(resident.date_of_birth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

    const detectionMetadata = interaction.metadata?.incident_detection || {};
    const categories = detectionMetadata.categories || [];
    const severity = detectionMetadata.severity || "medium";

    const incidentTime = new Date(interaction.interaction_start).toLocaleString(
      "en-GB",
      {
        dateStyle: "full",
        timeStyle: "short",
      }
    );

    const systemPrompt = `You are a professional care incident reporting assistant. Your role is to generate clear, factual, objective incident reports that meet CQC (Care Quality Commission) standards and legal requirements.

Guidelines for Incident Reports:
- Use factual, objective language
- Avoid assumptions or speculation
- Focus on what was observed and what happened
- Include specific times, locations, and actions taken
- Document any witnesses present
- Detail immediate responses and interventions
- Note any injuries, harm, or distress
- Specify who was notified (family, GP, manager, authorities)
- List all required follow-up actions
- Ensure report is suitable for CQC inspection and legal review

Structure the report with these sections:
1. Incident Summary
2. Detailed Description
3. Immediate Actions Taken
4. Injuries or Harm
5. Witnesses
6. Notifications Made
7. Risk Assessment
8. Follow-up Actions Required`;

    const userPrompt = `Generate a comprehensive incident report based on this interaction.

RESIDENT DETAILS:
Name: ${residentName}
${residentAge ? `Age: ${residentAge}` : ""}
${resident?.metadata?.conditions ? `Known Conditions: ${resident.metadata.conditions.join(", ")}` : ""}

INCIDENT DETAILS:
Date and Time: ${incidentTime}
Location: ${interaction.location || "Not specified"}
Severity: ${severity.toUpperCase()}
Categories: ${categories.join(", ")}
Detected Keywords: ${interaction.detected_concerns.join(", ")}

INTERACTION TRANSCRIPT:
${interaction.raw_transcript}

Please generate a complete incident report that:
1. Provides a clear summary of what occurred
2. Describes the incident in detail based on the transcript
3. Documents immediate actions taken (inferred from context)
4. Assesses any injuries, harm, or distress
5. Lists potential witnesses (if mentioned)
6. Specifies who should be notified (family, GP, safeguarding lead, etc.)
7. Assesses the risk level and contributing factors
8. Lists all required follow-up actions

Make the report professional, factual, and suitable for regulatory inspection.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;

    const summaryMatch = generatedContent.match(/incident summary[:\s]+(.*?)(?=\n\n|detailed description)/is);
    const summary = summaryMatch
      ? summaryMatch[1].trim().substring(0, 200)
      : `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity incident involving ${residentName}`;

    const keyObservations: string[] = [];
    const actionsTaken: string[] = [];
    const followUpRequired: string[] = [];

    const actionsMatch = generatedContent.match(/immediate actions taken[:\s]+(.*?)(?=injuries|witnesses|notifications|$)/is);
    if (actionsMatch) {
      const acts = actionsMatch[1].trim().split("\n").filter((line: string) =>
        line.trim().startsWith("-") || line.trim().startsWith("•") || line.trim().match(/^\d+\./)
      );
      actionsTaken.push(...acts.map((a: string) => a.replace(/^[-•\d.]+\s*/, "").trim()).filter(Boolean));
    }

    const followUpMatch = generatedContent.match(/follow-up actions required[:\s]+(.*?)$/is);
    if (followUpMatch) {
      const follow = followUpMatch[1].trim().split("\n").filter((line: string) =>
        line.trim().startsWith("-") || line.trim().startsWith("•") || line.trim().match(/^\d+\./)
      );
      followUpRequired.push(...follow.map((f: string) => f.replace(/^[-•\d.]+\s*/, "").trim()).filter(Boolean));
    }

    const observationsMatch = generatedContent.match(/detailed description[:\s]+(.*?)(?=immediate actions|$)/is);
    if (observationsMatch) {
      const obs = observationsMatch[1].trim().split("\n").filter((line: string) => line.trim().length > 20);
      keyObservations.push(...obs.map((o: string) => o.trim()).slice(0, 5));
    }

    const riskLevel = severity === "critical" ? "critical" : severity === "high" ? "high" : severity === "medium" ? "medium" : "low";

    const { data: documentation, error: docError } = await supabase
      .from("care_documentation")
      .insert({
        resident_id: residentId,
        organization_id: organizationId,
        interaction_log_id: interactionId,
        staff_id: user.id,
        document_type: "incident_report",
        document_title: `Incident Report - ${residentName} - ${new Date().toLocaleDateString("en-GB")}`,
        ai_generated_content: generatedContent,
        summary: summary,
        key_observations: keyObservations.length > 0 ? keyObservations : ["See full report"],
        actions_taken: actionsTaken.length > 0 ? actionsTaken : ["Assessment required"],
        follow_up_required: followUpRequired.length > 0 ? followUpRequired : ["Review required"],
        concerns_flagged: interaction.detected_concerns,
        risk_level: riskLevel,
        cqc_domain: "safe",
        status: "draft",
        document_date: new Date().toISOString().split("T")[0],
        metadata: {
          ai_model: "gpt-4o-mini",
          generation_timestamp: new Date().toISOString(),
          incident_categories: categories,
          incident_severity: severity,
          detected_keywords: interaction.detected_concerns,
          tokens_used: openaiData.usage.total_tokens,
          auto_generated: true,
        },
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Error saving incident report: ${docError.message}`);
    }

    await supabase
      .from("care_interaction_logs")
      .update({ documentation_generated: true, processed: true })
      .eq("id", interactionId);

    return new Response(
      JSON.stringify({
        success: true,
        documentation,
        severity,
        categories,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating incident report:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
