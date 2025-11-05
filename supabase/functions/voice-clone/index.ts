import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VoiceCloneRequest {
  elderId: string;
  nokId?: string;
  displayName: string;
  role: "reminder" | "checkin" | "general";
  audioFileUrl: string;
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
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: VoiceCloneRequest = await req.json();
    const { elderId, nokId, displayName, role, audioFileUrl } = requestData;

    if (!elderId || !displayName || !role || !audioFileUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: subscriptionData, error: subError } = await supabase.rpc('get_user_subscription_features', {
      p_user_id: elderId,
    });

    if (subError || !subscriptionData || subscriptionData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const voiceCloneFeature = subscriptionData.find((f: any) => f.feature_key === 'voice_cloning');
    if (!voiceCloneFeature) {
      return new Response(
        JSON.stringify({ error: "Voice cloning not available in your plan" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existingProfiles } = await supabase
      .from('voice_profiles')
      .select('id')
      .eq('elder_id', elderId);

    const currentCount = existingProfiles?.length || 0;
    const voiceCloneLimit = subscriptionData.find((f: any) => f.feature_key === 'voice_cloning_count');

    if (voiceCloneLimit && !voiceCloneLimit.is_unlimited && voiceCloneLimit.feature_limit) {
      if (currentCount >= voiceCloneLimit.feature_limit) {
        return new Response(
          JSON.stringify({
            error: `Voice cloning limit reached. Your plan allows ${voiceCloneLimit.feature_limit} voice clone(s).`,
            limitReached: true,
            upgradeUrl: '/pricing'
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("Downloading audio file from:", audioFileUrl);
    const audioResponse = await fetch(audioFileUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    console.log("Creating voice clone with ElevenLabs...");
    const formData = new FormData();
    formData.append("name", displayName);
    formData.append("files", new Blob([audioBuffer], { type: "audio/mpeg" }), "sample.mp3");
    formData.append("description", `Voice for ${displayName} - ${role}`);

    const voiceCloneResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
        },
        body: formData,
      }
    );

    if (!voiceCloneResponse.ok) {
      const errorText = await voiceCloneResponse.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${voiceCloneResponse.status} - ${errorText}`);
    }

    const voiceData = await voiceCloneResponse.json();
    const elevenVoiceId = voiceData.voice_id;

    console.log("Voice cloned successfully:", elevenVoiceId);

    const { data: voiceProfile, error: dbError } = await supabase
      .from("voice_profiles")
      .insert({
        elder_id: elderId,
        nok_id: nokId || null,
        eleven_voice_id: elevenVoiceId,
        display_name: displayName,
        role: role,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save voice profile: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        voiceId: elevenVoiceId,
        profileId: voiceProfile.id,
        message: "Voice cloned successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in voice-clone function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
