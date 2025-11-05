import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  messageId: string;
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

    const { messageId }: NotificationRequest = await req.json();

    if (!messageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "messageId is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: message, error: fetchError } = await supabase
      .from("family_messages")
      .select(`
        *,
        recipient:recipient_id (
          name,
          email,
          phone_number
        ),
        sender:sender_id (
          name
        )
      `)
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      throw new Error(`Failed to fetch message: ${fetchError?.message}`);
    }

    const notifications = [];

    if (message.notify_via_push) {
      notifications.push(
        supabase.from("message_delivery_log").insert([
          {
            message_id: message.id,
            delivery_method: "push",
            recipient_id: message.recipient_id,
            status: "sent",
            delivered_at: new Date().toISOString(),
          },
        ])
      );
    }

    if (message.notify_via_sms && message.recipient.phone_number) {
      notifications.push(sendSMSNotification(message, supabase));
    }

    if (message.notify_via_email) {
      notifications.push(
        supabase.from("message_delivery_log").insert([
          {
            message_id: message.id,
            delivery_method: "email",
            recipient_id: message.recipient_id,
            status: "sent",
            delivered_at: new Date().toISOString(),
          },
        ])
      );
    }

    await Promise.all(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications sent successfully",
        notificationCount: notifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-new-message:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendSMSNotification(message: any, supabase: any): Promise<void> {
  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log("Twilio not configured, skipping SMS");
      return;
    }

    const messageBody = message.subject
      ? `New message from ${message.sender.name}: ${message.subject}`
      : `You have a new message from ${message.sender.name}. Open Grace Companion to read it.`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: message.recipient.phone_number,
          From: twilioPhoneNumber,
          Body: messageBody,
        }),
      }
    );

    const result = await response.json();

    await supabase.from("message_delivery_log").insert([
      {
        message_id: message.id,
        delivery_method: "sms",
        recipient_id: message.recipient_id,
        status: response.ok ? "sent" : "failed",
        external_id: result.sid,
        error_message: response.ok ? null : result.message,
        delivered_at: response.ok ? new Date().toISOString() : null,
      },
    ]);
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    await supabase.from("message_delivery_log").insert([
      {
        message_id: message.id,
        delivery_method: "sms",
        recipient_id: message.recipient_id,
        status: "failed",
        error_message: error.message,
      },
    ]);
  }
}
