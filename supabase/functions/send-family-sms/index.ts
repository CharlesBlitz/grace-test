import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FamilySMSRequest {
  residentId: string;
  message: string;
  urgency?: "low" | "medium" | "high";
  sendToAll?: boolean;
  specificPhoneNumbers?: string[];
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

    const body: FamilySMSRequest = await req.json();
    const {
      residentId,
      message,
      urgency = "medium",
      sendToAll = true,
      specificPhoneNumbers,
    } = body;

    const { data: resident } = await supabase
      .from("users")
      .select("name, organization_id")
      .eq("id", residentId)
      .maybeSingle();

    if (!resident) {
      throw new Error("Resident not found");
    }

    const urgencyPrefix =
      urgency === "high" ? "URGENT: " : urgency === "low" ? "Update: " : "";
    const fullMessage = `${urgencyPrefix}${message} - Grace Companion`;

    let phoneNumbers: string[] = [];

    if (specificPhoneNumbers && specificPhoneNumbers.length > 0) {
      phoneNumbers = specificPhoneNumbers;
    } else if (sendToAll) {
      const { data: familyContacts } = await supabase
        .from("next_of_kin")
        .select("phone")
        .eq("user_id", residentId);

      phoneNumbers =
        familyContacts?.map((c) => c.phone).filter(Boolean) || [];

      const { data: escalationContacts } = await supabase
        .from("escalation_contacts")
        .select("phone_number")
        .eq("elder_id", residentId)
        .eq("active", true);

      const escalationPhones =
        escalationContacts?.map((c) => c.phone_number).filter(Boolean) || [];

      phoneNumbers = [...new Set([...phoneNumbers, ...escalationPhones])];
    }

    if (phoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No family contact phone numbers found",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const smsPromises = phoneNumbers.map((phone) =>
      fetch(`${supabaseUrl}/functions/v1/twilio-send-sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phone,
          message: fullMessage,
          messageType: "family_message",
          userId: residentId,
          organizationId: resident.organization_id,
          metadata: {
            resident_name: resident.name,
            urgency,
            original_message: message,
          },
        }),
      }).then((res) => res.json())
    );

    const results = await Promise.all(smsPromises);
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    const { error: messageLogError } = await supabase
      .from("family_messages")
      .insert({
        elder_id: residentId,
        message_content: message,
        message_type: "sms",
        sent_by: "system",
        sent_at: new Date().toISOString(),
        recipients_count: phoneNumbers.length,
        delivery_status: failedCount === 0 ? "sent" : "partial",
      });

    if (messageLogError) {
      console.error("Error logging family message:", messageLogError);
    }

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        recipientsSent: successCount,
        recipientsFailed: failedCount,
        totalRecipients: phoneNumbers.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending family SMS:", error);
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
