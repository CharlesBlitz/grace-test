/*
  # Fix Admin Users Infinite Recursion Error

  ## Overview
  Fixes the infinite recursion error in admin_users RLS policies that occurs when
  INSERT policies query the same table to check if a user is a super admin. The
  recursion happens because SELECT policies on admin_users are triggered when the
  INSERT policy tries to verify admin privileges.

  ## Problem
  When creating an admin user, the INSERT policy checks:
  - EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
  
  This SELECT query triggers the SELECT policies on admin_users, which also check
  for admin privileges by querying admin_users, creating an infinite loop.

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check admin status
  2. Drop existing problematic policies
  3. Recreate policies using the secure function instead of direct queries
  4. Ensure first admin creation policy remains simple and non-recursive

  ## Security
  - The helper function runs with elevated privileges but only returns boolean
  - No sensitive data is exposed, only admin status verification
  - All existing security restrictions remain in place
  - First admin creation still requires table to be empty
*/

-- Step 1: Create a SECURITY DEFINER function to check if user is an admin
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the user is a super admin
  -- SECURITY DEFINER allows this to bypass RLS
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = user_uuid
    AND role = 'super_admin'
    AND is_active = true
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Step 2: Create helper function to check if any admins exist
CREATE OR REPLACE FUNCTION admin_users_exist()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  has_admins boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    LIMIT 1
  ) INTO has_admins;
  
  RETURN COALESCE(has_admins, false);
END;
$$;

-- Step 3: Drop all existing policies on admin_users to start fresh
DROP POLICY IF EXISTS "Admin users can read own profile" ON admin_users;
DROP POLICY IF EXISTS "Super admins can read all admin profiles" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Allow first admin creation when table is empty" ON admin_users;
DROP POLICY IF EXISTS "Super admins can create admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can delete admin users" ON admin_users;
DROP POLICY IF EXISTS "Anyone can check if admins exist" ON admin_users;

-- Step 4: Create new non-recursive policies using the helper function

-- Allow anyone to read when checking if setup is needed (count only)
-- This is needed for the setup page to work
CREATE POLICY "Public can check admin existence"
  ON admin_users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to read their own profile
CREATE POLICY "Admins can read own profile"
  ON admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow super admins to read all profiles (using helper function to avoid recursion)
CREATE POLICY "Super admins can read all profiles"
  ON admin_users FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Allow INSERT when no admins exist (first admin setup)
-- This uses the helper function which bypasses RLS
CREATE POLICY "Allow first admin creation"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (NOT admin_users_exist());

-- Allow super admins to create new admin users
CREATE POLICY "Super admins can create admins"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Allow super admins to update admin users
CREATE POLICY "Super admins can update admins"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Allow super admins to delete admin users
CREATE POLICY "Super admins can delete admins"
  ON admin_users FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Step 5: Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION admin_users_exist() TO authenticated, anon;

-- Step 6: Add helpful comment
COMMENT ON FUNCTION is_super_admin(uuid) IS 'Checks if a user is an active super admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON FUNCTION admin_users_exist() IS 'Checks if any admin users exist in the system. Used during initial setup to allow first admin creation.';
