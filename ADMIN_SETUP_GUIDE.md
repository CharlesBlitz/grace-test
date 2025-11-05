# Admin Setup Guide for Grace Companion

This guide will help you create your first administrator account for the Grace Companion system.

## Overview

Grace Companion uses a two-tier authentication system:
1. **Supabase Auth** - Handles user authentication
2. **Admin Users Table** - Manages admin roles and permissions

## Admin Roles

The system supports four admin role types:

- **super_admin** - Full system access, can manage all admins and settings
- **support_staff** - User support and ticket management
- **billing_admin** - Subscription and payment management
- **read_only_auditor** - View-only access for compliance

## Method 1: Web-Based Setup (Recommended)

This is the easiest way to create your first admin account.

### Steps:

1. Navigate to: `https://your-domain.com/admin/setup`
   - Or locally: `http://localhost:3000/admin/setup`

2. Fill in the form:
   - **Full Name**: Your name (e.g., "John Doe")
   - **Email**: Your email address (this will be your login)
   - **Password**: A secure password (minimum 8 characters)
   - **Confirm Password**: Re-enter your password

3. Click "Create Super Admin Account"

4. You'll be redirected to the login page at `/admin/login`

5. Sign in with your new credentials

### Important Notes:

- The setup page is **only accessible when no admin accounts exist**
- Once an admin is created, the page will redirect to the login screen
- The first account is automatically created as a `super_admin`

## Method 2: SQL Script (Alternative)

If you prefer to use SQL directly, you can use the provided script.

### Steps:

1. Open the file: `scripts/create-first-admin.sql`

2. Edit these variables at the top of the script:
   ```sql
   v_email text := 'admin@gracecompanion.com'; -- Change to your email
   v_password text := 'ChangeMe123!'; -- Change to a secure password
   v_full_name text := 'System Administrator'; -- Change to your name
   ```

3. Open your Supabase Dashboard
   - Go to: SQL Editor
   - Create a new query

4. Copy and paste the entire SQL script

5. Click "Run" to execute

6. Check the output messages to confirm success

7. Navigate to `/admin/login` and sign in with your credentials

### Important Security Notes:

- **Change your password immediately after first login**
- Use a strong, unique password
- Never commit credentials to version control
- Delete or secure the SQL script after use

## Method 3: Supabase Dashboard (Manual)

If you want to manually create the admin account:

### Step 1: Create Auth User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Confirm the user's email (toggle to skip email confirmation)
5. Copy the user's UUID

### Step 2: Create Admin Entry

1. Go to Supabase Dashboard → Table Editor → admin_users
2. Click "Insert row"
3. Fill in:
   - `user_id`: Paste the UUID from Step 1
   - `full_name`: Your name
   - `email`: Your email (same as auth user)
   - `role`: Select `super_admin`
   - `is_active`: Set to `true`
   - `notes`: "Initial super admin account"
4. Save the row

### Step 3: Login

1. Navigate to `/admin/login`
2. Sign in with your credentials

## After Setup

Once you've successfully created and logged in with your admin account:

1. **Change Your Password**
   - Go to Settings → Security
   - Update to a strong, unique password

2. **Explore Admin Features**
   - User Management: Manage Grace Companion users
   - Organizations: Oversee care facilities
   - Grace Notes: Manage domiciliary care practitioners
   - Support Tickets: Handle user support requests
   - Notifications: Send system-wide announcements
   - Audit Logs: Review all administrative actions

3. **Create Additional Admins**
   - Navigate to: Admin Dashboard → Users → Admins
   - Click "Add Admin"
   - Assign appropriate roles based on responsibilities

## Security Best Practices

1. **Password Management**
   - Use a password manager
   - Enable 2FA if available
   - Change passwords regularly
   - Never share admin credentials

2. **Role Assignment**
   - Grant minimum necessary permissions
   - Use `super_admin` sparingly
   - Regularly review admin access
   - Remove inactive admin accounts

3. **Audit Trail**
   - All admin actions are logged
   - Review audit logs regularly
   - Monitor for suspicious activity
   - Keep logs for compliance requirements

## Troubleshooting

### "Setup Already Complete" Message

**Cause**: An admin account already exists in the database.

**Solution**: Navigate to `/admin/login` and use existing credentials.

### "You do not have admin access" Error

**Cause**: The user exists in auth but not in `admin_users` table.

**Solution**:
1. Use Method 3 to manually add the admin_users entry
2. Or delete the auth user and start over with Method 1

### Cannot Access Setup Page

**Cause**: Possible database connection issue or RLS policy blocking.

**Solution**:
1. Check your `.env` file has correct Supabase credentials
2. Verify database is running
3. Check Supabase logs for errors

### Authentication Failed

**Cause**: Incorrect credentials or account issues.

**Solution**:
1. Verify email and password are correct
2. Check if account is marked as `is_active: true`
3. Check Supabase Auth logs for details

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages
2. Review Supabase logs in your dashboard
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied

## Quick Reference

| Feature | URL |
|---------|-----|
| Setup Page | `/admin/setup` |
| Admin Login | `/admin/login` |
| Admin Dashboard | `/admin/monitoring` |
| Supabase Dashboard | Your Supabase project URL |

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
