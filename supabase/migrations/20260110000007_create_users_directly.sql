-- Create users directly in the database
-- This bypasses the trigger by inserting directly into auth.users
-- WARNING: This requires service_role permissions and should only be used as a workaround

-- Note: This approach uses Supabase's internal functions to create users
-- We'll use the auth.users table directly with proper password hashing

-- User 1: alvaro@nadalpiantini.com
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
  v_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'alvaro@nadalpiantini.com') INTO v_exists;
  
  IF v_exists THEN
    -- Get existing user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'alvaro@nadalpiantini.com' LIMIT 1;
    RAISE NOTICE 'User alvaro@nadalpiantini.com already exists with ID: %', v_user_id;
  ELSE
    -- Generate a UUID for the user
    v_user_id := gen_random_uuid();
    
    -- Hash the password using Supabase's method
    v_encrypted_password := crypt('1234567', gen_salt('bf'));
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'alvaro@nadalpiantini.com',
      v_encrypted_password,
      now(),
      now(),
      now(),
      '{"full_name": "Alvaro"}'::jsonb,
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'User alvaro@nadalpiantini.com created with ID: %', v_user_id;
  END IF;
  
  -- Create or update profile
  INSERT INTO pricewaze_profiles (id, email, full_name)
  VALUES (v_user_id, 'alvaro@nadalpiantini.com', 'Alvaro')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
    
  RAISE NOTICE 'Profile created/updated for alvaro@nadalpiantini.com';
END $$;

-- User 2: alexander@nadalpiantini.com
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
  v_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'alexander@nadalpiantini.com') INTO v_exists;
  
  IF v_exists THEN
    -- Get existing user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'alexander@nadalpiantini.com' LIMIT 1;
    RAISE NOTICE 'User alexander@nadalpiantini.com already exists with ID: %', v_user_id;
  ELSE
    -- Generate a UUID for the user
    v_user_id := gen_random_uuid();
    
    -- Hash the password
    v_encrypted_password := crypt('1234567', gen_salt('bf'));
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'alexander@nadalpiantini.com',
      v_encrypted_password,
      now(),
      now(),
      now(),
      '{"full_name": "Alexander"}'::jsonb,
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'User alexander@nadalpiantini.com created with ID: %', v_user_id;
  END IF;
  
  -- Create or update profile
  INSERT INTO pricewaze_profiles (id, email, full_name)
  VALUES (v_user_id, 'alexander@nadalpiantini.com', 'Alexander')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
    
  RAISE NOTICE 'Profile created/updated for alexander@nadalpiantini.com';
END $$;

-- Verify users were created
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('alvaro@nadalpiantini.com', 'alexander@nadalpiantini.com')
ORDER BY email;

-- Verify profiles were created
SELECT 
  id,
  email,
  full_name
FROM pricewaze_profiles
WHERE email IN ('alvaro@nadalpiantini.com', 'alexander@nadalpiantini.com')
ORDER BY email;

