import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    let twilioData: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        twilioData[key] = value.toString();
      }
    } else {
      twilioData = await req.json();
    }

    const {
      MessageSid,
      From,
      To,
      Body,
      NumMedia,
      MediaUrl0,
      MediaContentType0,
    } = twilioData;

    console.log("Received SMS webhook:", {
      from: From,
      to: To,
      body: Body,
      sid: MessageSid,
    });

    const { data: user } = await supabase
      .from("users")
      .select("id, name, organization_id")
      .eq("phone_number", From)
      .maybeSingle();

    const logEntry = {
      direction: "inbound",
      from_number: From,
      to_number: To,
      message_body: Body || "",
      message_type: "general",
      status: "received",
      twilio_sid: MessageSid,
      user_id: user?.id || null,
      organization_id: user?.organization_id || null,
      metadata: {
        num_media: NumMedia,
        media_url: MediaUrl0,
        media_type: MediaContentType0,
      },
    };

    const { error: logError } = await supabase
      .from("sms_logs")
      .insert(logEntry);

    if (logError) {
      console.error("Error logging incoming SMS:", logError);
    }

    let conversationId = null;
    if (user) {
      const { data: existingConv } = await supabase
        .from("two_way_sms_conversations")
        .select("id, message_count")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        await supabase
          .from("two_way_sms_conversations")
          .update({
            last_message_at: new Date().toISOString(),
            message_count: existingConv.message_count + 1,
          })
          .eq("id", conversationId);
      } else {
        const { data: newConv } = await supabase
          .from("two_way_sms_conversations")
          .insert({
            user_id: user.id,
            phone_number: From,
            message_count: 1,
            status: "active",
          })
          .select("id")
          .single();

        conversationId = newConv?.id;
      }
    }

    const bodyLower = (Body || "").toLowerCase();
    let responseMessage = "";

    if (bodyLower.includes("help") || bodyLower.includes("emergency")) {
      responseMessage =
        "We received your message and help is on the way. If this is an emergency, please call 999. - Grace Companion";

      if (user?.organization_id) {
        const { data: orgStaff } = await supabase
          .from("organization_users")
          .select("user_id, users(name, phone_number)")
          .eq("organization_id", user.organization_id)
          .eq("is_active", true)
          .in("role", ["organization_admin", "facility_director", "care_manager"])
          .limit(3);

        for (const staff of orgStaff || []) {
          if (staff.users?.phone_number) {
            const alertMessage = `URGENT: ${user.name || "A resident"} sent an SMS requesting help: "${Body}". Please respond immediately. - Grace Companion`;

            await fetch(`${supabaseUrl}/functions/v1/twilio-send-sms`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: staff.users.phone_number,
                message: alertMessage,
                messageType: "alert",
                organizationId: user.organization_id,
              }),
            });
          }
        }
      }
    } else if (bodyLower.includes("status") || bodyLower.includes("update")) {
      responseMessage =
        "Your care team has been notified and will provide an update soon. Thank you for using Grace Companion.";
    } else if (bodyLower.includes("stop") || bodyLower.includes("unsubscribe")) {
      if (user) {
        await supabase
          .from("communication_preferences")
          .upsert({
            user_id: user.id,
            sms_enabled: false,
          });
      }
      responseMessage =
        "You have been unsubscribed from SMS notifications. Reply START to re-enable. - Grace Companion";
    } else if (bodyLower.includes("start") || bodyLower.includes("subscribe")) {
      if (user) {
        await supabase
          .from("communication_preferences")
          .upsert({
            user_id: user.id,
            sms_enabled: true,
          });
      }
      responseMessage =
        "You have been subscribed to SMS notifications. Reply STOP to unsubscribe. - Grace Companion";
    } else {
      responseMessage =
        "Thank you for your message. Your care team will respond soon. Reply HELP for assistance. - Grace Companion";

      if (user?.organization_id) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          notification_type: "sms_received",
          title: "New SMS from resident",
          message: `${user.name} sent: "${Body}"`,
          priority: "medium",
          metadata: {
            from: From,
            conversation_id: conversationId,
            message_sid: MessageSid,
          },
        });
      }
    }

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Error processing SMS webhook:", error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>We're experiencing technical difficulties. Please try again later or contact your care team directly. - Grace Companion</Message>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
});
