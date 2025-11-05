# Superadmin Access Setup Complete

Your superadmin account setup is now ready. Follow these steps to gain full admin access.

## What Was Done

1. **Created a database function** (`setup_admin_user_phone`) that:
   - Adds phone number to your auth account
   - Creates/updates your user profile
   - Grants superadmin permissions
   - Ensures all necessary database entries exist

2. **Generated a setup script** that you need to run once

## Setup Steps

### Step 1: Run the SQL Setup Script

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Open the file: `scripts/setup-your-admin-account.sql`
5. **IMPORTANT:** Update these two values in the script:
   ```sql
   SELECT setup_admin_user_phone(
     'your-email@example.com',  -- Change to YOUR email
     '+447429014680'            -- Change to YOUR phone number
   );
   ```
6. Copy and paste the entire script into the SQL Editor
7. Click **"Run"** or press `Ctrl+Enter`

### Step 2: Verify Success

You should see output like this:
```json
{
  "success": true,
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "your-email@example.com",
  "phone": "+447429014680",
  "full_name": "Administrator",
  "message": "Admin user setup completed successfully"
}
```

### Step 3: Access Admin Portal

1. Navigate to: **`/admin/login`** (NOT the regular `/login` page)
   - Local: `http://localhost:3000/admin/login`
   - Production: `https://your-domain.com/admin/login`

2. Sign in with:
   - **Email:** Your registered email address
   - **Password:** The password you used during signup

3. You should be redirected to: `/admin/monitoring`

## Important Notes

### Two Different Login Pages

Your application has **TWO separate login systems**:

1. **Regular User Login** (`/login`)
   - Uses phone number + SMS verification
   - For elders and Next of Kin
   - Shown in your screenshot

2. **Admin Login** (`/admin/login`) ← **Use this one!**
   - Uses email + password
   - For administrators only
   - Bypasses phone verification

### Why You Saw the Phone Verification Screen

You were trying to log in at `/login` instead of `/admin/login`. The regular login page requires phone verification because it's designed for elders who may not use email regularly.

## Admin Features You'll Have Access To

Once logged in, you'll have access to:

- **User Management:** View and manage all user accounts
- **Organizations:** Oversee care facilities and their staff
- **Grace Notes:** Manage domiciliary care practitioners
- **Support Tickets:** Handle user support requests
- **Notifications:** Send system-wide announcements
- **Audit Logs:** Review all administrative actions
- **Reports:** Generate system analytics and compliance reports

## Troubleshooting

### "You do not have admin access"
- Make sure you ran the SQL script successfully
- Check that your email in the script matches your auth email exactly
- Verify the script output showed `"success": true`

### "Invalid credentials"
- Double-check your email and password
- Try resetting your password in Supabase Dashboard if needed
- Make sure you're using `/admin/login` not `/login`

### Still Showing Phone Verification
- You're on the wrong page! Go to `/admin/login`
- Clear your browser cache and cookies
- Try an incognito/private browser window

### Need to Reset Your Password?

Run this in Supabase SQL Editor:
```sql
UPDATE auth.users
SET encrypted_password = crypt('YourNewPassword123!', gen_salt('bf'))
WHERE email = 'your-email@example.com';
```

## Next Steps After Login

1. **Change your password** (if using a temporary one)
2. **Update your profile** with correct contact information
3. **Explore the admin dashboard** features
4. **Create additional admin users** if needed with appropriate roles

## Admin Role Types

Your account has the `super_admin` role, which gives you full access. Other available roles:

- **super_admin** - Full system access (your role)
- **support_staff** - User support and ticket management
- **billing_admin** - Subscription and payment management
- **read_only_auditor** - View-only access for compliance

## Questions?

If you encounter any issues:
1. Check the browser console for error messages
2. Review Supabase logs in your dashboard
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied

---

**Remember:** Always use `/admin/login` for admin access, not the regular `/login` page!
