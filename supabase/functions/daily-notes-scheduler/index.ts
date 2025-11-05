import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const { data: organizations } = await supabase
      .from("organizations")
      .select("id, name");

    if (!organizations || organizations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No organizations found",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = {
      totalProcessed: 0,
      totalGenerated: 0,
      totalSkipped: 0,
      errors: [] as string[],
    };

    for (const org of organizations) {
      try {
        const { data: interactions } = await supabase
          .from("care_interaction_logs")
          .select("resident_id, users!care_interaction_logs_resident_id_fkey(name)")
          .eq("organization_id", org.id)
          .gte("interaction_start", yesterday.toISOString())
          .lte("interaction_start", endOfYesterday.toISOString())
          .eq("documentation_generated", false);

        if (!interactions || interactions.length === 0) {
          continue;
        }

        const residentIds = Array.from(
          new Set(interactions.map((int: any) => int.resident_id))
        );

        const { data: existingNotes } = await supabase
          .from("care_documentation")
          .select("resident_id")
          .eq("organization_id", org.id)
          .eq("document_date", yesterday.toISOString().split("T")[0])
          .eq("document_type", "daily_note");

        const existingNoteResidents = new Set(
          existingNotes?.map((note) => note.resident_id) || []
        );

        for (const residentId of residentIds) {
          results.totalProcessed++;

          if (existingNoteResidents.has(residentId)) {
            results.totalSkipped++;
            continue;
          }

          try {
            const { data: residentInteractions } = await supabase
              .from("care_interaction_logs")
              .select("*")
              .eq("resident_id", residentId)
              .eq("organization_id", org.id)
              .gte("interaction_start", yesterday.toISOString())
              .lte("interaction_start", endOfYesterday.toISOString())
              .order("interaction_start", { ascending: true });

            if (!residentInteractions || residentInteractions.length === 0) {
              continue;
            }

            const { data: resident } = await supabase
              .from("users")
              .select("name, date_of_birth, metadata")
              .eq("id", residentId)
              .maybeSingle();

            const residentName = resident?.name || "Unknown Resident";
            const residentContext = resident?.metadata?.conditions
              ? `Known conditions: ${resident.metadata.conditions.join(", ")}`
              : "";

            const interactionSummaries = residentInteractions
              .map((int: any) => {
                const time = new Date(int.interaction_start).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const type = int.interaction_type.replace("_", " ");
                const transcript = int.raw_transcript || "No transcript available";
                const concerns = int.detected_concerns?.length > 0
                  ? `\n  Concerns flagged: ${int.detected_concerns.join(", ")}`
                  : "";
                const sentiment = int.sentiment_score !== null
                  ? `\n  Sentiment: ${
                      int.sentiment_score > 0
                        ? "Positive"
                        : int.sentiment_score < 0
                        ? "Negative"
                        : "Neutral"
                    }`
                  : "";

                return `[${time}] ${type.toUpperCase()}:\n  ${transcript}${sentiment}${concerns}`;
              })
              .join("\n\n");

            const allConcerns = residentInteractions
              .flatMap((int: any) => int.detected_concerns || [])
              .filter((c: string, i: number, arr: string[]) => arr.indexOf(c) === i);

            const averageSentiment =
              residentInteractions
                .filter((int: any) => int.sentiment_score !== null)
                .reduce((sum: number, int: any) => sum + (int.sentiment_score || 0), 0) /
              residentInteractions.filter((int: any) => int.sentiment_score !== null).length;

            const systemPrompt = `You are a professional care documentation assistant. Your role is to transform raw interaction data into clear, professional, person-centred daily care notes that meet CQC (Care Quality Commission) standards.

Guidelines:
- Use clear, professional language suitable for care records
- Focus on the resident's wellbeing, activities, and any changes in condition
- Highlight observations that support quality care delivery
- Be factual and objective, avoiding assumptions
- Use person-centred language (e.g., "Margaret enjoyed..." not "Patient was...")
- Flag any concerns or changes that require follow-up
- Structure the note with clear sections: Observations, Activities, Concerns, Actions Taken, Follow-up Required
- Keep the tone compassionate but professional`;

            const userPrompt = `Generate a daily care note for ${residentName} based on yesterday's interactions.
${residentContext}

Yesterday's Interactions:
${interactionSummaries}

Overall Sentiment: ${
              averageSentiment > 0
                ? "Positive"
                : averageSentiment < 0
                ? "Concerning"
                : "Neutral"
            }
${allConcerns.length > 0 ? `\nDetected Concerns: ${allConcerns.join(", ")}` : ""}

Please generate a comprehensive daily care note that summarizes these interactions in a professional, person-centred manner. Include specific sections for:
1. General Observations (physical and mental state)
2. Activities and Engagement
3. Concerns (if any detected)
4. Actions Taken by Care Staff
5. Follow-up Required

Keep the note concise but informative, suitable for inclusion in care records and CQC inspections.`;

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
                temperature: 0.7,
                max_tokens: 1000,
              }),
            });

            if (!openaiResponse.ok) {
              throw new Error(`OpenAI API error: ${await openaiResponse.text()}`);
            }

            const openaiData = await openaiResponse.json();
            const generatedContent = openaiData.choices[0].message.content;

            const keyObservations: string[] = [];
            const actionsTaken: string[] = [];
            const followUpRequired: string[] = [];

            const observationsMatch = generatedContent.match(
              /observations[:\s]+(.*?)(?=activities|concerns|actions|follow-up|$)/is
            );
            if (observationsMatch) {
              const obs = observationsMatch[1]
                .trim()
                .split("\n")
                .filter((line: string) => line.trim().startsWith("-") || line.trim().startsWith("•"));
              keyObservations.push(...obs.map((o: string) => o.replace(/^[-•]\s*/, "").trim()));
            }

            const actionsMatch = generatedContent.match(
              /actions taken[:\s]+(.*?)(?=follow-up|concerns|$)/is
            );
            if (actionsMatch) {
              const acts = actionsMatch[1]
                .trim()
                .split("\n")
                .filter((line: string) => line.trim().startsWith("-") || line.trim().startsWith("•"));
              actionsTaken.push(...acts.map((a: string) => a.replace(/^[-•]\s*/, "").trim()));
            }

            const followUpMatch = generatedContent.match(/follow-up required[:\s]+(.*?)$/is);
            if (followUpMatch) {
              const follow = followUpMatch[1]
                .trim()
                .split("\n")
                .filter((line: string) => line.trim().startsWith("-") || line.trim().startsWith("•"));
              followUpRequired.push(...follow.map((f: string) => f.replace(/^[-•]\s*/, "").trim()));
            }

            const riskLevel = allConcerns.length > 0
              ? allConcerns.some(
                  (c: string) =>
                    c.toLowerCase().includes("fall") ||
                    c.toLowerCase().includes("injury") ||
                    c.toLowerCase().includes("pain")
                )
                ? "high"
                : allConcerns.some(
                    (c: string) =>
                      c.toLowerCase().includes("confusion") || c.toLowerCase().includes("distress")
                  )
                ? "medium"
                : "low"
              : "none";

            const summary = generatedContent.split("\n").slice(0, 3).join(" ").substring(0, 200) + "...";

            const { error: docError } = await supabase.from("care_documentation").insert({
              resident_id: residentId,
              organization_id: org.id,
              document_type: "daily_note",
              document_title: `Daily Care Note - ${yesterday.toLocaleDateString("en-GB")}`,
              ai_generated_content: generatedContent,
              summary: summary,
              key_observations: keyObservations.length > 0 ? keyObservations : ["See full note for observations"],
              actions_taken: actionsTaken.length > 0 ? actionsTaken : ["See full note for actions"],
              follow_up_required: followUpRequired.length > 0 ? followUpRequired : [],
              concerns_flagged: allConcerns,
              risk_level: riskLevel,
              status: "draft",
              document_date: yesterday.toISOString().split("T")[0],
              metadata: {
                ai_model: "gpt-4o-mini",
                generation_timestamp: new Date().toISOString(),
                interaction_count: residentInteractions.length,
                tokens_used: openaiData.usage.total_tokens,
                average_sentiment: averageSentiment || null,
                auto_generated: true,
              },
            });

            if (docError) {
              throw new Error(`Error saving documentation: ${docError.message}`);
            }

            await supabase
              .from("care_interaction_logs")
              .update({ documentation_generated: true, processed: true })
              .in(
                "id",
                residentInteractions.map((int: any) => int.id)
              );

            results.totalGenerated++;
          } catch (error) {
            results.errors.push(
              `Error for resident ${residentId}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      } catch (error) {
        results.errors.push(
          `Error for organization ${org.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in daily notes scheduler:", error);
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