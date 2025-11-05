/*
  # Add NoK-Assisted Registration Support

  ## Overview
  Extends the users table to support registration by Next of Kin (NoK) for elders with dementia,
  including legal guardian consent tracking and relationship documentation.

  ## Changes Made

  1. **New Table: elder_nok_relationships**
     - `id` (uuid, primary key) - Unique relationship identifier
     - `elder_id` (uuid, foreign key) - References the elder user
     - `nok_id` (uuid, foreign key) - References the NoK/guardian user
     - `relationship_type` (text) - Type of relationship (son, daughter, spouse, guardian, etc.)
     - `is_primary_contact` (boolean) - Whether this NoK is the primary contact
     - `can_modify_settings` (boolean) - Permission to modify elder's settings
     - `created_at` (timestamptz) - When relationship was established

  2. **New Columns in users table**
     - `registered_by_nok` (boolean) - Whether account was created by a NoK
     - `guardian_consent_on` (timestamptz) - When guardian provided consent
     - `guardian_consent_doc` (text) - Reference to legal consent documentation

  3. **Security**
     - Enable RLS on new table
     - Add policies for NoK and elder access
     - Ensure proper access controls for guardian-registered accounts

  ## Important Notes
  - NoK must establish their own account first before registering an elder
  - Legal guardian consent is tracked separately from elder consent
  - Primary contact designation allows for multiple family members with different permission levels
*/

-- Add new columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'registered_by_nok'
  ) THEN
    ALTER TABLE users ADD COLUMN registered_by_nok boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'guardian_consent_on'
  ) THEN
    ALTER TABLE users ADD COLUMN guardian_consent_on timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'guardian_consent_doc'
  ) THEN
    ALTER TABLE users ADD COLUMN guardian_consent_doc text;
  END IF;
END $$;

-- Create elder_nok_relationships table
CREATE TABLE IF NOT EXISTS elder_nok_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nok_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  is_primary_contact boolean DEFAULT false,
  can_modify_settings boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(elder_id, nok_id)
);

-- Enable RLS
ALTER TABLE elder_nok_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for elder_nok_relationships

-- NoKs can view their own relationships
CREATE POLICY "NoKs can view their relationships"
  ON elder_nok_relationships FOR SELECT
  TO authenticated
  USING (nok_id = auth.uid());

-- Elders can view their relationships
CREATE POLICY "Elders can view their relationships"
  ON elder_nok_relationships FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

-- NoKs can create relationships (when registering an elder)
CREATE POLICY "NoKs can create relationships"
  ON elder_nok_relationships FOR INSERT
  TO authenticated
  WITH CHECK (nok_id = auth.uid());

-- Primary NoKs can update relationships
CREATE POLICY "Primary NoKs can update relationships"
  ON elder_nok_relationships FOR UPDATE
  TO authenticated
  USING (
    nok_id = auth.uid() 
    AND is_primary_contact = true
  )
  WITH CHECK (
    nok_id = auth.uid() 
    AND is_primary_contact = true
  );

-- Primary NoKs can delete relationships
CREATE POLICY "Primary NoKs can delete relationships"
  ON elder_nok_relationships FOR DELETE
  TO authenticated
  USING (
    nok_id = auth.uid() 
    AND is_primary_contact = true
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_elder_nok_relationships_elder_id 
  ON elder_nok_relationships(elder_id);

CREATE INDEX IF NOT EXISTS idx_elder_nok_relationships_nok_id 
  ON elder_nok_relationships(nok_id);

CREATE INDEX IF NOT EXISTS idx_elder_nok_relationships_primary 
  ON elder_nok_relationships(elder_id, is_primary_contact) 
  WHERE is_primary_contact = true;
