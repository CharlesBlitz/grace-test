-- Setup Your Admin Account with Phone Number
--
-- This script will:
-- 1. Add phone number to your auth account
-- 2. Create/update your users table entry
-- 3. Ensure you have superadmin access in admin_users table
--
-- INSTRUCTIONS:
-- 1. Replace 'your-email@example.com' with YOUR actual email address
-- 2. Replace '+447429014680' with YOUR actual phone number (if different)
-- 3. Copy and paste this entire script into Supabase SQL Editor
-- 4. Click "Run"

-- ============================================
-- STEP 1: Update your email and phone here:
-- ============================================
SELECT setup_admin_user_phone(
  'your-email@example.com',  -- ⚠️ CHANGE THIS to your actual email
  '+447429014680'            -- ⚠️ CHANGE THIS to your actual phone number
);

-- ============================================
-- You should see a success message like:
-- {
--   "success": true,
--   "user_id": "your-uuid-here",
--   "email": "your-email@example.com",
--   "phone": "+447429014680",
--   "full_name": "Administrator",
--   "message": "Admin user setup completed successfully"
-- }
-- ============================================

-- After running this successfully:
-- 1. Go to /admin/login
-- 2. Sign in with your email and password
-- 3. You should now have full superadmin access!
