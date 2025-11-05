import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertRequest {
  interactionId: string;
  organizationId: string;
  residentId: string;
  severity: string;
  categories: string[];
  detectedKeywords: string[];
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

    const body: AlertRequest = await req.json();
    const {
      interactionId,
      organizationId,
      residentId,
      severity,
      categories,
      detectedKeywords,
    } = body;

    const { data: resident } = await supabase
      .from("users")
      .select("name")
      .eq("id", residentId)
      .maybeSingle();

    const residentName = resident?.name || "Unknown Resident";

    const { data: interaction } = await supabase
      .from("care_interaction_logs")
      .select("raw_transcript, interaction_start, location")
      .eq("id", interactionId)
      .maybeSingle();

    const alertMessage = `🚨 INCIDENT ALERT - ${severity.toUpperCase()} SEVERITY

Resident: ${residentName}
Time: ${new Date(interaction?.interaction_start).toLocaleString("en-GB")}
Location: ${interaction?.location || "Not specified"}

Categories: ${categories.join(", ")}
Keywords Detected: ${detectedKeywords.join(", ")}

Immediate action may be required. Please review the incident in the care documentation system.`;

    const { data: orgStaff } = await supabase
      .from("organization_users")
      .select("user_id, role, users(name, email, phone_number)")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("role", ["organization_admin", "facility_director", "care_manager"]);

    const notificationPromises = [];
    const smsPromises = [];

    for (const staff of orgStaff || []) {
      const notificationData = {
        user_id: staff.user_id,
        notification_type: "incident_alert",
        title: `${severity.toUpperCase()} Incident Alert`,
        message: `Potential ${severity} severity incident detected for ${residentName}`,
        priority: severity === "critical" || severity === "high" ? "high" : "medium",
        metadata: {
          interaction_id: interactionId,
          resident_id: residentId,
          organization_id: organizationId,
          severity,
          categories,
          detected_keywords: detectedKeywords,
        },
        read: false,
      };

      notificationPromises.push(
        supabase.from("notifications").insert(notificationData)
      );

      if (severity === "critical" && staff.users?.phone_number) {
        const smsMessage = `INCIDENT ALERT: ${severity.toUpperCase()} severity incident detected for ${residentName}. Categories: ${categories.join(", ")}. Please review immediately. - Grace Companion`;

        smsPromises.push(
          fetch(`${supabaseUrl}/functions/v1/twilio-send-sms`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: staff.users.phone_number,
              message: smsMessage,
              messageType: "incident",
              userId: staff.user_id,
              organizationId: organizationId,
              metadata: {
                resident_id: residentId,
                resident_name: residentName,
                severity,
                categories,
              },
            }),
          })
        );
      }
    }

    await Promise.all([...notificationPromises, ...smsPromises]);

    const { error: logError } = await supabase.from("incident_alert_log").insert({
      interaction_id: interactionId,
      organization_id: organizationId,
      resident_id: residentId,
      severity,
      categories,
      detected_keywords: detectedKeywords,
      staff_notified_count: orgStaff?.length || 0,
      alert_message: alertMessage,
    });

    if (logError) {
      console.error("Error logging incident alert:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Incident alert sent successfully",
        staffNotified: orgStaff?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending incident alert:", error);
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
