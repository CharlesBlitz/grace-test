/*
  # Fix Users Table Schema Mismatch
  
  ## Summary
  Fixes column name mismatches in the users table to resolve the error:
  "column 'user_id' of relation 'users' does not exist"
  
  ## Issues Found
  1. The users table has `name` column but functions reference `full_name`
  2. Functions reference `is_nok` column which doesn't exist in users table
  3. Functions reference `updated_at` column which doesn't exist in users table
  
  ## Changes Made
  1. Add missing columns to users table:
     - `full_name` - to store user's full name (keeping `name` for backward compatibility)
     - `is_nok` - boolean flag to identify Next of Kin users
     - `updated_at` - timestamp for tracking updates
  
  2. Populate `full_name` from existing `name` column for existing users
  
  ## Security
  - Maintains existing RLS policies
  - No breaking changes to existing functionality
*/

-- Add missing columns to users table
DO $$
BEGIN
  -- Add full_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name text;
    
    -- Copy existing name values to full_name
    UPDATE users SET full_name = name WHERE full_name IS NULL;
  END IF;

  -- Add is_nok column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'is_nok'
  ) THEN
    ALTER TABLE users ADD COLUMN is_nok boolean DEFAULT false;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Add index on full_name for faster searches
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- Add index on is_nok for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_is_nok ON users(is_nok) WHERE is_nok = true;

-- Add comment explaining the schema
COMMENT ON COLUMN users.full_name IS 'User full name - used by admin and registration functions';
COMMENT ON COLUMN users.name IS 'User display name - legacy column, may differ from full_name';
COMMENT ON COLUMN users.is_nok IS 'Indicates if this user is a Next of Kin (family member/guardian)';
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last update to user record';
