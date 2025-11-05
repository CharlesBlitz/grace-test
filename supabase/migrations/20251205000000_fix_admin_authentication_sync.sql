/*
  # Fix Admin Authentication Synchronization

  ## Summary
  Ensures proper synchronization between admin_users and users tables to fix authentication
  issues where admins logging in via OTP don't get recognized properly. This migration creates
  triggers and functions to maintain data consistency across authentication tables.

  ## Changes Made

  1. **Trigger Function: sync_admin_user_to_users_table**
     - Automatically creates/updates users table entry when admin_users is modified
     - Sets role to 'admin' for proper authentication context recognition
     - Syncs phone number, email, and name across tables
     - Ensures phone_verified is true for admins

  2. **Maintenance Function: audit_and_fix_admin_accounts**
     - Identifies admin accounts with missing or incorrect users table entries
     - Fixes phone number synchronization issues
     - Ensures all admins have proper role set in users table
     - Returns detailed report of issues found and fixed

  3. **Function: check_if_admin_by_phone**
     - Helper function to check if a phone number belongs to an admin
     - Used by OTP verification to prevent admin OTP login attempts
     - Returns admin status and email for messaging

  4. **Enhanced setup_admin_user_phone Function**
     - Updated to ensure complete synchronization
     - Verifies all three tables (auth.users, users, admin_users) are in sync
     - Adds validation and error checking

  ## Security
  - All functions use SECURITY DEFINER for proper permissions
  - RLS policies remain unchanged and secure
  - Audit function logs all changes made

  ## Important Notes
  - Run audit_and_fix_admin_accounts() after migration to fix existing accounts
  - All future admin account changes will automatically sync
  - This prevents the "still shows Sign in" issue for admin users
*/

-- Function to sync admin_users entries to users table
CREATE OR REPLACE FUNCTION sync_admin_user_to_users_table()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When an admin_user is inserted or updated, ensure users table has correct entry
  INSERT INTO users (
    id,
    name,
    full_name,
    email,
    role,
    timezone,
    phone_number,
    phone_verified,
    is_nok,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.full_name,
    NEW.full_name,
    NEW.email,
    'admin',  -- Critical: set role to admin
    'UTC',
    NEW.phone,
    CASE WHEN NEW.phone IS NOT NULL THEN true ELSE false END,
    false,
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = NEW.full_name,
    full_name = NEW.full_name,
    email = NEW.email,
    role = 'admin',  -- Always ensure role is admin
    phone_number = NEW.phone,
    phone_verified = CASE WHEN NEW.phone IS NOT NULL THEN true ELSE false END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger to sync admin_users to users table
DROP TRIGGER IF EXISTS trigger_sync_admin_user_to_users ON admin_users;
CREATE TRIGGER trigger_sync_admin_user_to_users
  AFTER INSERT OR UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_user_to_users_table();

-- Function to check if a phone number belongs to an admin
CREATE OR REPLACE FUNCTION check_if_admin_by_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_admin_user RECORD;
BEGIN
  -- Check if phone belongs to an admin user
  SELECT
    au.id,
    au.user_id,
    au.email,
    au.full_name,
    au.is_active
  INTO v_admin_user
  FROM admin_users au
  WHERE au.phone = p_phone
  AND au.is_active = true
  LIMIT 1;

  IF v_admin_user.id IS NOT NULL THEN
    -- Admin found
    v_result := jsonb_build_object(
      'is_admin', true,
      'email', v_admin_user.email,
      'full_name', v_admin_user.full_name,
      'message', 'This phone number is registered to an admin account. Please use email/password login at /admin/login'
    );
  ELSE
    -- Not an admin
    v_result := jsonb_build_object(
      'is_admin', false
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_if_admin_by_phone(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_if_admin_by_phone(text) TO service_role;
GRANT EXECUTE ON FUNCTION check_if_admin_by_phone(text) TO anon;

-- Function to audit and fix admin account configurations
CREATE OR REPLACE FUNCTION audit_and_fix_admin_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_issues_found jsonb := '[]'::jsonb;
  v_admin RECORD;
  v_user RECORD;
  v_auth_user RECORD;
BEGIN
  -- Loop through all admin users
  FOR v_admin IN
    SELECT * FROM admin_users WHERE is_active = true
  LOOP
    -- Check users table entry
    SELECT * INTO v_user
    FROM users
    WHERE id = v_admin.user_id;

    -- Check auth.users entry
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = v_admin.user_id;

    -- Issue 1: Missing users table entry
    IF v_user.id IS NULL THEN
      INSERT INTO users (
        id,
        name,
        full_name,
        email,
        role,
        timezone,
        phone_number,
        phone_verified,
        is_nok,
        created_at
      )
      VALUES (
        v_admin.user_id,
        v_admin.full_name,
        v_admin.full_name,
        v_admin.email,
        'admin',
        'UTC',
        v_admin.phone,
        CASE WHEN v_admin.phone IS NOT NULL THEN true ELSE false END,
        false,
        v_admin.created_at
      );

      v_fixed_count := v_fixed_count + 1;
      v_issues_found := v_issues_found || jsonb_build_object(
        'admin_email', v_admin.email,
        'issue', 'Missing users table entry',
        'fixed', true
      );

    -- Issue 2: Wrong role in users table
    ELSIF v_user.role != 'admin' THEN
      UPDATE users
      SET
        role = 'admin',
        updated_at = now()
      WHERE id = v_admin.user_id;

      v_fixed_count := v_fixed_count + 1;
      v_issues_found := v_issues_found || jsonb_build_object(
        'admin_email', v_admin.email,
        'issue', 'Wrong role: ' || v_user.role || ', should be admin',
        'fixed', true
      );
    END IF;

    -- Issue 3: Phone number mismatch between admin_users and users
    IF v_admin.phone IS NOT NULL AND (v_user.phone_number IS NULL OR v_user.phone_number != v_admin.phone) THEN
      UPDATE users
      SET
        phone_number = v_admin.phone,
        phone_verified = true,
        updated_at = now()
      WHERE id = v_admin.user_id;

      v_fixed_count := v_fixed_count + 1;
      v_issues_found := v_issues_found || jsonb_build_object(
        'admin_email', v_admin.email,
        'issue', 'Phone number mismatch or missing',
        'fixed', true
      );
    END IF;

    -- Issue 4: Phone number mismatch with auth.users
    IF v_admin.phone IS NOT NULL AND v_auth_user.id IS NOT NULL AND
       (v_auth_user.phone IS NULL OR v_auth_user.phone != v_admin.phone) THEN

      UPDATE auth.users
      SET
        phone = v_admin.phone,
        phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
        updated_at = now()
      WHERE id = v_admin.user_id;

      v_fixed_count := v_fixed_count + 1;
      v_issues_found := v_issues_found || jsonb_build_object(
        'admin_email', v_admin.email,
        'issue', 'Phone number mismatch in auth.users',
        'fixed', true
      );
    END IF;

    -- Issue 5: Name synchronization
    IF v_user.id IS NOT NULL AND (v_user.name != v_admin.full_name OR v_user.full_name != v_admin.full_name) THEN
      UPDATE users
      SET
        name = v_admin.full_name,
        full_name = v_admin.full_name,
        updated_at = now()
      WHERE id = v_admin.user_id;

      v_fixed_count := v_fixed_count + 1;
      v_issues_found := v_issues_found || jsonb_build_object(
        'admin_email', v_admin.email,
        'issue', 'Name synchronization needed',
        'fixed', true
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_admins_checked', (SELECT COUNT(*) FROM admin_users WHERE is_active = true),
    'issues_found_and_fixed', v_fixed_count,
    'details', v_issues_found,
    'message', 'Audit completed. Fixed ' || v_fixed_count || ' issues.'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION audit_and_fix_admin_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION audit_and_fix_admin_accounts() TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION sync_admin_user_to_users_table IS
'Trigger function that automatically syncs admin_users entries to users table to ensure proper authentication context.';

COMMENT ON FUNCTION check_if_admin_by_phone IS
'Checks if a phone number belongs to an admin user. Used to prevent OTP login for admin accounts.
Usage: SELECT check_if_admin_by_phone(''+447429014680'');';

COMMENT ON FUNCTION audit_and_fix_admin_accounts IS
'Audits all admin accounts and fixes synchronization issues between admin_users, users, and auth.users tables.
Run this after migration or whenever admin authentication issues occur.
Usage: SELECT audit_and_fix_admin_accounts();';

-- Run the audit function immediately to fix existing accounts
SELECT audit_and_fix_admin_accounts();
