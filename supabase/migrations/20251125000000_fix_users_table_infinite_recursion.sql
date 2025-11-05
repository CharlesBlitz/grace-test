/*
  # Fix Users Table Infinite Recursion Error

  ## Overview
  Fixes the infinite recursion error in the users table RLS policies. The problem occurs
  when the "Admins have full access to users" policy queries the users table to check
  if the current user is an admin, creating a circular reference.

  ## Problem
  The policy checks:
  ```sql
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
  ```

  This SELECT query on the users table triggers the SELECT policies on users, which
  includes this same policy, creating an infinite loop.

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check user roles
  2. Replace the recursive policy with a non-recursive version using the helper function
  3. Maintain all existing security restrictions

  ## Security
  - The helper function runs with elevated privileges but only returns role information
  - No sensitive data is exposed beyond what's already accessible
  - All existing security restrictions remain in place
*/

-- Step 1: Create a SECURITY DEFINER function to check user role
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Get the user's role
  -- SECURITY DEFINER allows this to bypass RLS
  SELECT role INTO user_role_value
  FROM users
  WHERE id = user_uuid;

  RETURN user_role_value;
END;
$$;

-- Step 2: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN get_user_role(user_uuid) = 'admin';
END;
$$;

-- Step 3: Create helper function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_user_organization_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN get_user_role(user_uuid) = 'organization_admin';
END;
$$;

-- Step 4: Drop the recursive policy
DROP POLICY IF EXISTS "Admins have full access to users" ON users;

-- Step 5: Create new non-recursive policy using helper function
CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  TO authenticated
  USING (is_user_admin(auth.uid()));

-- Step 6: Also ensure organization admins can access their org's users
DROP POLICY IF EXISTS "Organization admins can view organization users" ON users;
CREATE POLICY "Organization admins can view organization users"
  ON users FOR SELECT
  TO authenticated
  USING (
    is_user_organization_admin(auth.uid()) AND
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Step 7: Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_organization_admin(uuid) TO authenticated;

-- Step 8: Add helpful comments
COMMENT ON FUNCTION get_user_role(uuid) IS 'Gets the role of a user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON FUNCTION is_user_admin(uuid) IS 'Checks if a user has admin role. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION is_user_organization_admin(uuid) IS 'Checks if a user has organization_admin role. Uses SECURITY DEFINER to bypass RLS.';
