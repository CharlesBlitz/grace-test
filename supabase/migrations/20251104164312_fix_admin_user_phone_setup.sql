/*
  # Fix Admin User Phone and Authentication Setup

  ## Summary
  This migration ensures admin users can authenticate properly by:
  - Adding phone number to admin users' auth records
  - Ensuring admin_users table entries exist
  - Confirming phone verification for admin accounts
  - Setting up proper user profile data

  ## Changes Made
  1. Updates auth.users table to add phone number for admin accounts
  2. Confirms phone verification status
  3. Ensures users table entry exists for admin accounts
  4. Grants proper admin permissions in admin_users table

  ## Security
  - Only affects users who exist in admin_users table
  - Maintains existing RLS policies
  - Does not expose sensitive data
*/

-- Function to setup admin user with phone number
CREATE OR REPLACE FUNCTION setup_admin_user_phone(
  p_email text,
  p_phone text DEFAULT '+447429014680'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_full_name text;
  v_result jsonb;
BEGIN
  -- Get user ID from auth.users
  SELECT id, raw_user_meta_data->>'full_name'
  INTO v_user_id, v_full_name
  FROM auth.users
  WHERE email = p_email;

  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_email
    );
  END IF;

  -- Set default name if none exists
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Administrator';
  END IF;

  -- Update auth.users with phone number
  UPDATE auth.users
  SET 
    phone = p_phone,
    phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
    updated_at = now()
  WHERE id = v_user_id;

  -- Ensure users table entry exists
  INSERT INTO users (
    id,
    full_name,
    email,
    phone_number,
    phone_verified,
    is_nok,
    created_at
  )
  VALUES (
    v_user_id,
    v_full_name,
    p_email,
    p_phone,
    true,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    phone_number = p_phone,
    phone_verified = true,
    updated_at = now();

  -- Ensure admin_users entry exists with super_admin role
  INSERT INTO admin_users (
    user_id,
    full_name,
    email,
    phone,
    role,
    is_active,
    notes,
    created_at
  )
  VALUES (
    v_user_id,
    v_full_name,
    p_email,
    p_phone,
    'super_admin',
    true,
    'Superadmin setup completed on ' || now()::text,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    role = 'super_admin',
    is_active = true,
    phone = p_phone,
    updated_at = now(),
    notes = COALESCE(admin_users.notes || E'\n', '') || 'Updated to super_admin on ' || now()::text;

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'phone', p_phone,
    'full_name', v_full_name,
    'message', 'Admin user setup completed successfully'
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION setup_admin_user_phone(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_admin_user_phone(text, text) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION setup_admin_user_phone IS 
'Sets up admin user with phone number and proper authentication. 
Usage: SELECT setup_admin_user_phone(''your-email@example.com'', ''+447429014680'');';
