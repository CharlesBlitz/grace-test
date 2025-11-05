import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MakeCallRequest {
  to: string;
  message: string;
  callType?: string;
  userId?: string;
  organizationId?: string;
  useClonedVoice?: boolean;
  voiceProfileId?: string;
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
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Twilio credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: MakeCallRequest = await req.json();
    const {
      to,
      message,
      callType,
      userId,
      organizationId,
      useClonedVoice,
      voiceProfileId,
      metadata,
    } = body;

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

    let twimlUrl = "";

    if (useClonedVoice && voiceProfileId && elevenLabsApiKey) {
      const { data: profile } = await supabase
        .from("voice_profiles")
        .select("elevenlabs_voice_id")
        .eq("id", voiceProfileId)
        .maybeSingle();

      if (profile?.elevenlabs_voice_id) {
        try {
          const ttsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${profile.elevenlabs_voice_id}`,
            {
              method: "POST",
              headers: {
                "xi-api-key": elevenLabsApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: message,
                model_id: "eleven_monolingual_v1",
              }),
            }
          );

          if (ttsResponse.ok) {
            const audioBlob = await ttsResponse.arrayBuffer();
            const timestamp = Date.now();
            const fileName = `calls/${userId || "system"}-${timestamp}.mp3`;

            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from("voice-recordings")
              .upload(fileName, audioBlob, {
                contentType: "audio/mpeg",
                upsert: false,
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase
                .storage
                .from("voice-recordings")
                .getPublicUrl(fileName);

              if (urlData) {
                twimlUrl = `https://twimlets.com/echo?Twiml=%3CResponse%3E%3CPlay%3E${encodeURIComponent(urlData.publicUrl)}%3C%2FPlay%3E%3C%2FResponse%3E`;
              }
            }
          }
        } catch (error) {
          console.error("Error generating cloned voice:", error);
        }
      }
    }

    if (!twimlUrl) {
      const encodedMessage = encodeURIComponent(message);
      twimlUrl = `https://twimlets.com/echo?Twiml=%3CResponse%3E%3CSay%20voice%3D%22Polly.Joanna%22%3E${encodedMessage}%3C%2FSay%3E%3C%2FResponse%3E`;
    }

    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const callBody = new URLSearchParams({
      To: formattedPhone,
      From: twilioPhoneNumber,
      Url: twimlUrl,
    });

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: callBody.toString(),
      }
    );

    const twilioResult = await twilioResponse.json();

    const logEntry = {
      direction: "outbound",
      from_number: twilioPhoneNumber,
      to_number: formattedPhone,
      call_type: callType || "general",
      message_content: message,
      status: twilioResponse.ok ? "initiated" : "failed",
      twilio_sid: twilioResult.sid,
      used_cloned_voice: useClonedVoice || false,
      voice_profile_id: voiceProfileId || null,
      user_id: userId || null,
      organization_id: organizationId || null,
      metadata: metadata || {},
    };

    const { error: logError } = await supabase
      .from("voice_call_logs")
      .insert(logEntry);

    if (logError) {
      console.error("Error logging call:", logError);
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
          error: twilioResult.message || "Failed to initiate call",
          code: twilioResult.code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error making call:", error);
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
