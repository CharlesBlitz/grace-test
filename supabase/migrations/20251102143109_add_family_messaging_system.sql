/*
  # Family-to-Elder Messaging System

  ## Overview
  Enables Next of Kin to send warm, personal messages to elders including text, voice recordings,
  photos, and scheduled delivery. Supports message categories, reactions, and delivery preferences.

  ## Changes Made

  1. **New Table: family_messages**
     - Stores all messages from family members to elders
     - Supports text, voice, and photo attachments
     - Includes scheduling and delivery tracking
     - Category-based organization (note, encouragement, update, special_occasion)
     
  2. **New Table: message_attachments**
     - Stores file attachments (photos, voice recordings)
     - Links to family_messages table
     - Includes file metadata and storage paths
     
  3. **New Table: message_reactions**
     - Tracks elder reactions to messages
     - Simple emoji-based acknowledgment system
     - Timestamps for NOK awareness
     
  4. **New Table: message_delivery_log**
     - Audit trail of message delivery attempts
     - Tracks read status and delivery methods
     - Supports push, SMS, and email notifications

  ## Security
  - RLS policies ensure NOKs can only message their linked elders
  - Elders can only view messages sent to them
  - Message attachments are access-controlled
  - Delivery logs are accessible to both sender and recipient

  ## Important Notes
  - Voice recordings should be stored in Supabase Storage bucket 'voice-messages'
  - Photos should be stored in Supabase Storage bucket 'family-photos'
  - Scheduled messages require a cron job or Edge Function trigger
  - Text-to-speech integration uses existing ElevenLabs integration
*/

-- Create family_messages table
CREATE TABLE IF NOT EXISTS family_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text,
  message_text text NOT NULL,
  category text NOT NULL DEFAULT 'note' CHECK (category IN ('note', 'encouragement', 'update', 'special_occasion', 'reminder', 'question')),
  
  -- Scheduling and delivery
  scheduled_for timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  is_draft boolean DEFAULT false,
  
  -- Voice and multimedia
  has_voice_attachment boolean DEFAULT false,
  use_cloned_voice_for_tts boolean DEFAULT false,
  voice_profile_id uuid REFERENCES voice_profiles(id),
  has_photo_attachment boolean DEFAULT false,
  
  -- Delivery preferences
  notify_via_sms boolean DEFAULT false,
  notify_via_push boolean DEFAULT true,
  notify_via_email boolean DEFAULT false,
  
  -- Metadata
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES family_messages(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('photo', 'voice', 'document')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes integer,
  mime_type text,
  storage_bucket text NOT NULL,
  thumbnail_path text,
  duration_seconds integer,
  created_at timestamptz DEFAULT now()
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES family_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'smile', 'thanks', 'hug', 'thumbsup', 'seen')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create message_delivery_log table
CREATE TABLE IF NOT EXISTS message_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES family_messages(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('app', 'sms', 'email', 'push')),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  attempt_count integer DEFAULT 1,
  last_attempt_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  error_message text,
  external_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_messages

-- NOKs can create messages for their elders
CREATE POLICY "NOKs can create messages for their elders"
  ON family_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    recipient_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid()
    )
  );

-- NOKs can view messages they sent
CREATE POLICY "NOKs can view messages they sent"
  ON family_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

-- Elders can view messages sent to them
CREATE POLICY "Elders can view their messages"
  ON family_messages FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- NOKs can update their own draft messages
CREATE POLICY "NOKs can update their draft messages"
  ON family_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() AND is_draft = true)
  WITH CHECK (sender_id = auth.uid());

-- NOKs can delete their own draft messages
CREATE POLICY "NOKs can delete their draft messages"
  ON family_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() AND is_draft = true);

-- Elders can update read status
CREATE POLICY "Elders can mark messages as read"
  ON family_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- RLS Policies for message_attachments

-- NOKs can add attachments to their messages
CREATE POLICY "NOKs can add attachments to their messages"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT id FROM family_messages WHERE sender_id = auth.uid()
    )
  );

-- Users can view attachments for messages they can access
CREATE POLICY "Users can view attachments for accessible messages"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM family_messages 
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- NOKs can delete attachments from their draft messages
CREATE POLICY "NOKs can delete attachments from draft messages"
  ON message_attachments FOR DELETE
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM family_messages 
      WHERE sender_id = auth.uid() AND is_draft = true
    )
  );

-- RLS Policies for message_reactions

-- Elders can add reactions to their messages
CREATE POLICY "Elders can add reactions to their messages"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT id FROM family_messages WHERE recipient_id = auth.uid()
    )
  );

-- Users can view reactions on messages they can access
CREATE POLICY "Users can view reactions on accessible messages"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM family_messages 
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions"
  ON message_reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for message_delivery_log

-- System can insert delivery logs
CREATE POLICY "System can insert delivery logs"
  ON message_delivery_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view delivery logs for messages they can access
CREATE POLICY "Users can view delivery logs for accessible messages"
  ON message_delivery_log FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM family_messages 
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- System can update delivery logs
CREATE POLICY "System can update delivery logs"
  ON message_delivery_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_messages_recipient ON family_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_messages_sender ON family_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_messages_scheduled ON family_messages(scheduled_for) WHERE scheduled_for IS NOT NULL AND delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_family_messages_unread ON family_messages(recipient_id, read_at) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_delivery_log_message_id ON message_delivery_log(message_id);
CREATE INDEX IF NOT EXISTS idx_message_delivery_log_status ON message_delivery_log(status) WHERE status IN ('pending', 'failed');

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_family_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_family_messages_updated_at ON family_messages;
CREATE TRIGGER trigger_update_family_messages_updated_at
  BEFORE UPDATE ON family_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_family_messages_updated_at();