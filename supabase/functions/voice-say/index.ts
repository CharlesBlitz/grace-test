import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VoiceSayRequest {
  voiceId: string;
  text: string;
  modelId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const defaultModelId = Deno.env.get("ELEVENLABS_MODEL_ID") || "eleven_multilingual_v2";

    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const requestData: VoiceSayRequest = await req.json();
    const { voiceId, text, modelId } = requestData;

    if (!voiceId || !text) {
      return new Response(
        JSON.stringify({ error: "Missing voiceId or text" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const textHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${voiceId}-${text}`)
    );
    const hashHex = Array.from(new Uint8Array(textHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const cacheKey = `cache/tts/${hashHex}.mp3`;

    console.log("Checking cache for:", cacheKey);
    const { data: cachedFile } = await supabase.storage
      .from("audio")
      .download(cacheKey);

    if (cachedFile) {
      console.log("Cache hit! Returning cached audio");
      return new Response(cachedFile, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "X-Cache": "HIT",
        },
      });
    }

    console.log("Cache miss. Generating TTS with ElevenLabs...");
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId || defaultModelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("ElevenLabs TTS error:", errorText);
      throw new Error(`ElevenLabs TTS error: ${ttsResponse.status} - ${errorText}`);
    }

    const audioBlob = await ttsResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(cacheKey, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Failed to cache audio:", uploadError);
    } else {
      console.log("Audio cached successfully");
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error in voice-say function:", error);
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
