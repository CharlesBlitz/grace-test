import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WellnessReportRequest {
  residentId: string;
  familyContactPhone: string;
  weekStart: string;
  weekEnd: string;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: WellnessReportRequest = await req.json();
    const { residentId, familyContactPhone, weekStart, weekEnd } = body;

    const { data: resident } = await supabase
      .from("users")
      .select("name")
      .eq("id", residentId)
      .maybeSingle();

    if (!resident) {
      throw new Error("Resident not found");
    }

    const { data: interactions } = await supabase
      .from("care_interaction_logs")
      .select("*")
      .eq("elder_id", residentId)
      .gte("interaction_start", weekStart)
      .lte("interaction_start", weekEnd)
      .order("interaction_start", { ascending: false });

    const totalInteractions = interactions?.length || 0;
    const moodData = interactions?.map((i) => i.detected_mood).filter(Boolean);
    const avgMood = moodData?.length
      ? moodData.reduce((sum: number, mood: any) => {
          const moodValue =
            mood === "positive" ? 1 : mood === "neutral" ? 0 : -1;
          return sum + moodValue;
        }, 0) / moodData.length
      : 0;

    const moodDescription =
      avgMood > 0.3
        ? "positive"
        : avgMood < -0.3
        ? "needs attention"
        : "stable";

    const { data: medicationTasks } = await supabase
      .from("care_tasks")
      .select("*")
      .eq("elder_id", residentId)
      .eq("task_category", "medication")
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd);

    const completedMedications = medicationTasks?.filter(
      (t) => t.completed_at
    ).length || 0;
    const totalMedications = medicationTasks?.length || 0;
    const medicationCompliance = totalMedications
      ? Math.round((completedMedications / totalMedications) * 100)
      : 100;

    const { data: incidents } = await supabase
      .from("incident_alert_log")
      .select("severity")
      .eq("resident_id", residentId)
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd);

    const incidentCount = incidents?.length || 0;
    const criticalIncidents =
      incidents?.filter((i) => i.severity === "critical").length || 0;

    let summary = `Weekly Wellness Report for ${resident.name}:\n\n`;
    summary += `Interactions: ${totalInteractions}\n`;
    summary += `Mood: ${moodDescription}\n`;
    summary += `Medication Compliance: ${medicationCompliance}%\n`;

    if (incidentCount > 0) {
      summary += `Incidents: ${incidentCount}${
        criticalIncidents > 0 ? ` (${criticalIncidents} critical)` : ""
      }\n`;
    }

    summary += `\nFor detailed information, log in to Grace Companion.`;

    const smsResponse = await fetch(
      `${supabaseUrl}/functions/v1/twilio-send-sms`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: familyContactPhone,
          message: summary,
          messageType: "wellness",
          userId: residentId,
          metadata: {
            report_type: "weekly_wellness",
            week_start: weekStart,
            week_end: weekEnd,
            interactions: totalInteractions,
            mood: moodDescription,
            medication_compliance: medicationCompliance,
            incidents: incidentCount,
          },
        }),
      }
    );

    const smsResult = await smsResponse.json();

    return new Response(
      JSON.stringify({
        success: smsResult.success,
        summary,
        stats: {
          interactions: totalInteractions,
          mood: moodDescription,
          medicationCompliance,
          incidents: incidentCount,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending wellness SMS:", error);
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
