import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendSMSRequest {
  to: string;
  message: string;
  messageType?: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Twilio credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: SendSMSRequest = await req.json();
    const { to, message, messageType, userId, organizationId, metadata } = body;

    if (!to || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, message",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formattedPhone = formatPhoneNumber(to);

    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const smsBody = new URLSearchParams({
      To: formattedPhone,
      From: twilioPhoneNumber,
      Body: message,
    });

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: smsBody.toString(),
      }
    );

    const twilioResult = await twilioResponse.json();

    const logEntry = {
      direction: "outbound",
      from_number: twilioPhoneNumber,
      to_number: formattedPhone,
      message_body: message,
      message_type: messageType || "general",
      status: twilioResponse.ok ? "sent" : "failed",
      twilio_sid: twilioResult.sid,
      error_code: twilioResult.code,
      error_message: twilioResult.message,
      user_id: userId || null,
      organization_id: organizationId || null,
      metadata: metadata || {},
    };

    const { error: logError } = await supabase
      .from("sms_logs")
      .insert(logEntry);

    if (logError) {
      console.error("Error logging SMS:", logError);
    }

    if (twilioResponse.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          sid: twilioResult.sid,
          status: twilioResult.status,
          to: formattedPhone,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: twilioResult.message || "Failed to send SMS",
          code: twilioResult.code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
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

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("44")) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith("0")) {
    return `+44${cleaned.substring(1)}`;
  } else if (cleaned.length === 10) {
    return `+44${cleaned}`;
  }

  return `+${cleaned}`;
}
