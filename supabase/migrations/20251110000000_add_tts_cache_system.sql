/*
  # TTS Cache System

  1. New Tables
    - `tts_audio_cache`
      - `id` (uuid, primary key)
      - `text_hash` (text, unique) - SHA256 hash of the text for deduplication
      - `text` (text) - Original text
      - `voice_id` (text) - ElevenLabs voice ID used
      - `model_id` (text) - ElevenLabs model ID used
      - `audio_url` (text) - Supabase Storage URL for the audio file
      - `audio_size` (integer) - Size in bytes
      - `hit_count` (integer) - Number of times this cache entry was used
      - `created_at` (timestamptz)
      - `last_accessed_at` (timestamptz)
      - `expires_at` (timestamptz) - Cache expiration (90 days default)

  2. Security
    - Enable RLS on `tts_audio_cache` table
    - Add policies for authenticated users to read cache
    - Only system can write to cache (service role)

  3. Indexes
    - Index on text_hash for fast lookups
    - Index on expires_at for cleanup jobs
    - Index on hit_count for analytics

  4. Storage
    - Create 'tts-cache' bucket for audio files

  5. Functions
    - Function to clean up expired cache entries
    - Function to update hit count and last accessed time
*/

-- Create TTS audio cache table
CREATE TABLE IF NOT EXISTS tts_audio_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text UNIQUE NOT NULL,
  text text NOT NULL,
  voice_id text NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  model_id text NOT NULL DEFAULT 'eleven_turbo_v2',
  audio_url text NOT NULL,
  audio_size integer NOT NULL DEFAULT 0,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);

-- Enable RLS
ALTER TABLE tts_audio_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read from cache (public data)
CREATE POLICY "Anyone can read TTS cache"
  ON tts_audio_cache
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert cache entries
CREATE POLICY "Service role can insert TTS cache"
  ON tts_audio_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Only service role can update cache entries
CREATE POLICY "Service role can update TTS cache"
  ON tts_audio_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Only service role can delete cache entries
CREATE POLICY "Service role can delete TTS cache"
  ON tts_audio_cache
  FOR DELETE
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tts_cache_text_hash ON tts_audio_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_tts_cache_expires_at ON tts_audio_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_tts_cache_hit_count ON tts_audio_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_tts_cache_last_accessed ON tts_audio_cache(last_accessed_at);

-- Function to update cache hit count
CREATE OR REPLACE FUNCTION increment_tts_cache_hit(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tts_audio_cache
  SET
    hit_count = hit_count + 1,
    last_accessed_at = now()
  WHERE id = cache_id;
END;
$$;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_tts_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM tts_audio_cache
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- Function to get or create cache entry (returns null if not found)
CREATE OR REPLACE FUNCTION get_tts_cache_entry(
  p_text_hash text,
  p_voice_id text DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  p_model_id text DEFAULT 'eleven_turbo_v2'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cache_entry json;
BEGIN
  SELECT json_build_object(
    'id', id,
    'audio_url', audio_url,
    'audio_size', audio_size,
    'hit_count', hit_count
  )
  INTO cache_entry
  FROM tts_audio_cache
  WHERE
    text_hash = p_text_hash
    AND voice_id = p_voice_id
    AND model_id = p_model_id
    AND expires_at > now();

  IF cache_entry IS NOT NULL THEN
    PERFORM increment_tts_cache_hit((cache_entry->>'id')::uuid);
  END IF;

  RETURN cache_entry;
END;
$$;

-- Create storage bucket for TTS audio cache
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can read from tts-cache bucket
CREATE POLICY IF NOT EXISTS "Anyone can read TTS cache files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tts-cache');

-- Storage policy: Authenticated users can upload to tts-cache
CREATE POLICY IF NOT EXISTS "Service role can upload TTS cache files"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'tts-cache');

-- Storage policy: Service role can delete from tts-cache
CREATE POLICY IF NOT EXISTS "Service role can delete TTS cache files"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'tts-cache');
