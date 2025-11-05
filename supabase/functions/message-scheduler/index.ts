import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScheduledMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  message_text: string;
  scheduled_for: string;
  notify_via_sms: boolean;
  notify_via_push: boolean;
  notify_via_email: boolean;
  recipient: {
    name: string;
    email: string;
    phone_number: string | null;
  };
  sender: {
    name: string;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    const { data: scheduledMessages, error: fetchError } = await supabase
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
      .lte("scheduled_for", now)
      .is("delivered_at", null)
      .eq("is_draft", false)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled messages: ${fetchError.message}`);
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No messages due for delivery",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    for (const message of scheduledMessages as ScheduledMessage[]) {
      try {
        const { error: updateError } = await supabase
          .from("family_messages")
          .update({ delivered_at: now })
          .eq("id", message.id);

        if (updateError) {
          console.error(`Failed to mark message ${message.id} as delivered:`, updateError);
          results.push({
            messageId: message.id,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        if (message.notify_via_push) {
          await supabase.from("message_delivery_log").insert([
            {
              message_id: message.id,
              delivery_method: "push",
              recipient_id: message.recipient_id,
              status: "sent",
              delivered_at: now,
            },
          ]);
        }

        if (message.notify_via_sms && message.recipient.phone_number) {
          await sendSMSNotification(message, supabase);
        }

        if (message.notify_via_email) {
          await sendEmailNotification(message, supabase);
        }

        results.push({
          messageId: message.id,
          success: true,
          recipientName: message.recipient.name,
        });
      } catch (error: any) {
        console.error(`Error processing message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${scheduledMessages.length} scheduled messages`,
        successCount,
        failureCount: results.length - successCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in message-scheduler:", error);
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

async function sendSMSNotification(
  message: ScheduledMessage,
  supabase: any
): Promise<void> {
  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log("Twilio not configured, skipping SMS");
      return;
    }

    const messageBody = message.subject
      ? `New message from ${message.sender.name}: ${message.subject}\n\n${message.message_text}`
      : `New message from ${message.sender.name}:\n\n${message.message_text}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: message.recipient.phone_number!,
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

async function sendEmailNotification(
  message: ScheduledMessage,
  supabase: any
): Promise<void> {
  try {
    await supabase.from("message_delivery_log").insert([
      {
        message_id: message.id,
        delivery_method: "email",
        recipient_id: message.recipient_id,
        status: "sent",
        delivered_at: new Date().toISOString(),
      },
    ]);
  } catch (error: any) {
    console.error("Error logging email notification:", error);
  }
}
