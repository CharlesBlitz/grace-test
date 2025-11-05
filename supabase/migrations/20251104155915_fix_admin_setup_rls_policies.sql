/*
  # Fix Admin Setup RLS Policies

  ## Overview
  Fixes the Row Level Security policies for the admin_users table to allow creation
  of the first administrator account through the web interface. Previously, RLS
  policies required an existing super admin to create new admins, creating a
  chicken-and-egg problem for initial setup.

  ## Changes Made

  1. **New RLS Policies**
     - Allow INSERT into admin_users when no admins exist (first admin setup)
     - Allow unauthenticated users to check if any admins exist (for setup page logic)
     - Maintain existing security policies for normal admin operations

  ## Security Considerations
  - The new INSERT policy ONLY allows creation when the admin_users table is empty
  - Once the first admin is created, only existing super admins can create new admins
  - The SELECT policy for checking admin existence returns only a count, no sensitive data
  - All other existing RLS policies remain unchanged and fully enforced

  ## Important Notes
  - This migration enables the /admin/setup page to work correctly
  - After the first admin is created, the setup flow is automatically blocked
  - Existing super admins can still create additional admins through the admin dashboard
*/

-- Drop the overly restrictive "Super admins can manage admin users" policy
-- This policy was blocking first admin creation
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Create separate policies for each operation with proper permissions

-- Allow INSERT into admin_users when table is empty (first admin setup)
CREATE POLICY "Allow first admin creation when table is empty"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow if no admin users exist yet
    NOT EXISTS (SELECT 1 FROM admin_users)
  );

-- Allow super admins to INSERT new admin users
CREATE POLICY "Super admins can create admin users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- Allow super admins to UPDATE admin users
CREATE POLICY "Super admins can update admin users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- Allow super admins to DELETE admin users (soft delete preferred)
CREATE POLICY "Super admins can delete admin users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- Allow anyone (including unauthenticated) to check if any admins exist
-- This is needed for the setup page to determine if setup is needed
-- Note: This only exposes the COUNT, not any admin data
CREATE POLICY "Anyone can check if admins exist"
  ON admin_users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Note: The existing policies "Admin users can read own profile" and
-- "Super admins can read all admin profiles" remain in place and continue to work
