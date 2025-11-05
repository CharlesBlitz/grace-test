import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface TTSCacheEntry {
  id: string;
  audio_url: string;
  audio_size: number;
  hit_count: number;
}

export interface TTSCacheOptions {
  voiceId?: string;
  modelId?: string;
  language?: string;
}

export class TTSCache {
  private static readonly DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
  private static readonly DEFAULT_MODEL_ID = 'eleven_turbo_v2';

  static async get(
    text: string,
    options: TTSCacheOptions = {}
  ): Promise<Blob | null> {
    try {
      const textHash = await generateTextHash(text);
      const voiceId = options.voiceId || this.DEFAULT_VOICE_ID;
      const modelId = options.modelId || this.DEFAULT_MODEL_ID;
      const language = options.language || 'en';

      // Include language in cache lookup for multilingual support
      const cacheKey = `${textHash}_${language}`;

      const { data, error } = await supabase.rpc('get_tts_cache_entry', {
        p_text_hash: cacheKey,
        p_voice_id: voiceId,
        p_model_id: modelId,
      });

      if (error || !data) {
        return null;
      }

      const cacheEntry = data as TTSCacheEntry;

      const audioResponse = await fetch(cacheEntry.audio_url);
      if (!audioResponse.ok) {
        console.error('Failed to fetch cached audio:', audioResponse.statusText);
        return null;
      }

      return await audioResponse.blob();
    } catch (error) {
      console.error('Error retrieving from TTS cache:', error);
      return null;
    }
  }

  static async set(
    text: string,
    audioBlob: Blob,
    options: TTSCacheOptions = {}
  ): Promise<boolean> {
    try {
      const textHash = await generateTextHash(text);
      const voiceId = options.voiceId || this.DEFAULT_VOICE_ID;
      const modelId = options.modelId || this.DEFAULT_MODEL_ID;
      const language = options.language || 'en';

      // Include language in cache key for multilingual support
      const cacheKey = `${textHash}_${language}`;
      const fileName = `${cacheKey}.mp3`;
      const filePath = `${voiceId}/${language}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tts-cache')
        .upload(filePath, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        return false;
      }

      const { data: urlData } = supabase.storage
        .from('tts-cache')
        .getPublicUrl(filePath);

      const audioUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('tts_audio_cache')
        .insert({
          text_hash: cacheKey,
          text: text,
          voice_id: voiceId,
          model_id: modelId,
          audio_url: audioUrl,
          audio_size: audioBlob.size,
        });

      if (dbError) {
        console.error('Error saving to cache database:', dbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting TTS cache:', error);
      return false;
    }
  }

  static async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    totalHits: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('tts_audio_cache')
        .select('audio_size, hit_count');

      if (error || !data) {
        return null;
      }

      const totalEntries = data.length;
      const totalSize = data.reduce((sum, entry) => sum + entry.audio_size, 0);
      const totalHits = data.reduce((sum, entry) => sum + entry.hit_count, 0);

      return {
        totalEntries,
        totalSize,
        totalHits,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }
}

export const COMMON_PHRASES = [
  "Hello! I'm Grace, and I'm delighted to help you get started. What's your name?",
  "Hello! I'm Grace. Thank you for helping your loved one register. May I start by getting your name?",
  "Thank you! Could you tell me your email address?",
  "Great! And what's your timezone?",
  "Perfect! Let me confirm the information you've provided.",
  "Thank you for completing the registration. Welcome to Grace Companion!",
  "I'm sorry, I didn't catch that. Could you please repeat?",
  "Let me help you with that.",
  "Is there anything else I can help you with?",
];
