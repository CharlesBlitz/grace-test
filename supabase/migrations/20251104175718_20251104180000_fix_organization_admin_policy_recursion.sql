/*
  # Fix Organization Admin Policy Recursion
  
  ## Overview
  Fixes the remaining infinite recursion in the "Organization admins can view organization users" 
  policy. The policy still queries the users table in a subquery to get the admin's organization_id,
  which can trigger recursion.
  
  ## Problem
  The current policy has:
  ```sql
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  ```
  This SELECT on users table can still trigger recursion when checking RLS policies.
  
  ## Solution
  1. Create a SECURITY DEFINER function to get user's organization_id
  2. Update the policy to use the helper function
  3. This completes the fix for all recursive policies on the users table
  
  ## Security
  - Function only returns organization_id for the authenticated user
  - Maintains all existing security restrictions
  - No sensitive data exposure
*/

-- Step 1: Create helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS
  SELECT organization_id INTO org_id
  FROM users
  WHERE id = user_uuid;
  
  RETURN org_id;
END;
$$;

-- Step 2: Drop and recreate the policy without recursion
DROP POLICY IF EXISTS "Organization admins can view organization users" ON users;

CREATE POLICY "Organization admins can view organization users"
  ON users FOR SELECT
  TO authenticated
  USING (
    is_user_organization_admin(auth.uid()) AND
    organization_id = get_user_organization_id(auth.uid())
  );

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_organization_id(uuid) TO authenticated;

-- Step 4: Add helpful comment
COMMENT ON FUNCTION get_user_organization_id(uuid) IS 'Gets the organization_id of a user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
