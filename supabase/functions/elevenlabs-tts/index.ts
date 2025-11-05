import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { text, voiceId, languageCode, userId } = await req.json();

    console.log('Received request:', { text: text?.substring(0, 50), voiceId });

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");

    console.log('API Key present:', !!elevenLabsApiKey);
    console.log('API Key length:', elevenLabsApiKey?.length);
    console.log('API Key first 10 chars:', elevenLabsApiKey?.substring(0, 10));

    if (!elevenLabsApiKey) {
      console.error('ELEVENLABS_API_KEY environment variable not found');
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured in environment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client if userId is provided for language-based voice selection
    let selectedVoiceId = voiceId;
    let modelId = "eleven_turbo_v2";

    if (userId && languageCode && !voiceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user's language preferences
        const { data: preferences } = await supabase
          .from("user_language_preferences")
          .select("preferred_voice_id")
          .eq("user_id", userId)
          .single();

        if (preferences?.preferred_voice_id?.[languageCode]) {
          selectedVoiceId = preferences.preferred_voice_id[languageCode];
          console.log(`Using user's preferred voice for ${languageCode}:`, selectedVoiceId);
        } else {
          // Fallback to default voice for language
          const { data: mapping } = await supabase
            .from("language_voice_mappings")
            .select("voice_id, model_id")
            .eq("language_code", languageCode)
            .eq("is_default", true)
            .single();

          if (mapping) {
            selectedVoiceId = mapping.voice_id;
            modelId = mapping.model_id || "eleven_multilingual_v2";
            console.log(`Using default voice for ${languageCode}:`, selectedVoiceId);
          }
        }
      } catch (error) {
        console.error("Error fetching voice preferences:", error);
      }
    }

    // Default to English voice if nothing else worked
    if (!selectedVoiceId) {
      selectedVoiceId = "EXAVITQu4vr4xnSDxMaL";
      console.log("Using default English voice");
    }

    // Use multilingual model if language code is provided and not English
    if (languageCode && languageCode !== "en" && languageCode !== "en-GB" && languageCode !== "en-US") {
      modelId = "eleven_multilingual_v2";
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`;

    console.log('Calling ElevenLabs API:', { url: elevenLabsUrl, languageCode, modelId });

    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": elevenLabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    console.log('ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to generate speech",
          status: response.status,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Successfully received audio from ElevenLabs');

    const audioBuffer = await response.arrayBuffer();

    console.log('Audio buffer size:', audioBuffer.byteLength);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error in elevenlabs-tts function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});