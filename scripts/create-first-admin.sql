-- Create First Admin Account for Grace Companion
-- This script creates the initial super admin account
-- Run this ONCE in your Supabase SQL Editor

-- Step 1: Create the auth user
-- Replace 'your-email@example.com' and 'your-secure-password' with your actual credentials
-- The email will be your admin login email
-- The password should be strong and secure

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@gracecompanion.com'; -- CHANGE THIS to your email
  v_password text := 'ChangeMe123!'; -- CHANGE THIS to a secure password
  v_full_name text := 'System Administrator'; -- CHANGE THIS to your name
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- Create the auth user
    -- Note: This uses Supabase's internal auth schema
    -- In production, you should use the Supabase dashboard or API to create users

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_full_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created auth user with ID: %', v_user_id;

    -- Create corresponding identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Created identity record';

    -- Create admin_users entry
    INSERT INTO admin_users (
      user_id,
      full_name,
      email,
      role,
      is_active,
      notes
    ) VALUES (
      v_user_id,
      v_full_name,
      v_email,
      'super_admin',
      true,
      'Initial system administrator account created via setup script'
    );

    RAISE NOTICE 'Created admin_users record';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'SUCCESS! Your admin account has been created.';
    RAISE NOTICE 'Email: %', v_email;
    RAISE NOTICE 'Password: %', v_password;
    RAISE NOTICE '======================================';
    RAISE NOTICE 'IMPORTANT: Change your password after first login!';
    RAISE NOTICE 'You can now login at /admin/login';
  ELSE
    RAISE NOTICE 'User with email % already exists!', v_email;

    -- Check if admin_users entry exists
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
      -- Create admin_users entry for existing user
      INSERT INTO admin_users (
        user_id,
        full_name,
        email,
        role,
        is_active,
        notes
      ) VALUES (
        v_user_id,
        v_full_name,
        v_email,
        'super_admin',
        true,
        'Admin access granted to existing user'
      );
      RAISE NOTICE 'Added admin access to existing user';
    ELSE
      RAISE NOTICE 'User already has admin access';
    END IF;
  END IF;
END $$;
