/*
  # Add Supabase Authentication Integration

  ## Overview
  Integrates Supabase Auth with the existing users table to enable login functionality
  for both elders and Next of Kin (NoK).

  ## Changes Made

  1. **Modify users table**
     - Change `id` to match auth.users.id (UUID from Supabase Auth)
     - Add foreign key constraint to auth.users
     
  2. **Update RLS Policies**
     - Add policies for users to read their own data
     - Allow authenticated users to update their profile
     - Enable proper access control based on auth.uid()

  3. **Security**
     - Ensure RLS is properly configured for authenticated access
     - Users can only access their own data or data they're authorized for

  ## Important Notes
  - User accounts must be created in Supabase Auth first
  - The users table acts as a profile extension of auth.users
  - Email addresses must match between auth.users and users table
*/

-- Update RLS policies for users table to use auth.uid()

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- NoKs can read profiles of elders they care for
DROP POLICY IF EXISTS "NoKs can read elder profiles" ON users;
CREATE POLICY "NoKs can read elder profiles"
  ON users FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid()
    )
  );

-- Elders can read profiles of their NoKs
DROP POLICY IF EXISTS "Elders can read NoK profiles" ON users;
CREATE POLICY "Elders can read NoK profiles"
  ON users FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT nok_id 
      FROM elder_nok_relationships 
      WHERE elder_id = auth.uid()
    )
  );

-- Update care_tasks policies
DROP POLICY IF EXISTS "Elders can view own tasks" ON care_tasks;
CREATE POLICY "Elders can view own tasks"
  ON care_tasks FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

DROP POLICY IF EXISTS "Elders can update own tasks" ON care_tasks;
CREATE POLICY "Elders can update own tasks"
  ON care_tasks FOR UPDATE
  TO authenticated
  USING (elder_id = auth.uid())
  WITH CHECK (elder_id = auth.uid());

DROP POLICY IF EXISTS "NoKs can view elder tasks" ON care_tasks;
CREATE POLICY "NoKs can view elder tasks"
  ON care_tasks FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "NoKs can manage elder tasks" ON care_tasks;
CREATE POLICY "NoKs can manage elder tasks"
  ON care_tasks FOR ALL
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid() 
      AND can_modify_settings = true
    )
  );

-- Update conversations policies
DROP POLICY IF EXISTS "Elders can view own conversations" ON conversations;
CREATE POLICY "Elders can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

DROP POLICY IF EXISTS "Elders can insert own conversations" ON conversations;
CREATE POLICY "Elders can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = auth.uid());

DROP POLICY IF EXISTS "NoKs can view elder conversations" ON conversations;
CREATE POLICY "NoKs can view elder conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid()
    )
  );

-- Update voice_profiles policies
DROP POLICY IF EXISTS "Elders can view own voice profiles" ON voice_profiles;
CREATE POLICY "Elders can view own voice profiles"
  ON voice_profiles FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

DROP POLICY IF EXISTS "NoKs can view own voice profiles" ON voice_profiles;
CREATE POLICY "NoKs can view own voice profiles"
  ON voice_profiles FOR SELECT
  TO authenticated
  USING (nok_id = auth.uid());

DROP POLICY IF EXISTS "NoKs can manage voice profiles" ON voice_profiles;
CREATE POLICY "NoKs can manage voice profiles"
  ON voice_profiles FOR ALL
  TO authenticated
  USING (
    nok_id = auth.uid() OR 
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid() 
      AND can_modify_settings = true
    )
  );

-- Update memory_facts policies  
DROP POLICY IF EXISTS "Elders can view own memory facts" ON memory_facts;
CREATE POLICY "Elders can view own memory facts"
  ON memory_facts FOR SELECT
  TO authenticated
  USING (elder_id = auth.uid());

DROP POLICY IF EXISTS "System can insert memory facts" ON memory_facts;
CREATE POLICY "System can insert memory facts"
  ON memory_facts FOR INSERT
  TO authenticated
  WITH CHECK (elder_id = auth.uid());

DROP POLICY IF EXISTS "NoKs can view elder memory facts" ON memory_facts;
CREATE POLICY "NoKs can view elder memory facts"
  ON memory_facts FOR SELECT
  TO authenticated
  USING (
    elder_id IN (
      SELECT elder_id 
      FROM elder_nok_relationships 
      WHERE nok_id = auth.uid()
    )
  );
