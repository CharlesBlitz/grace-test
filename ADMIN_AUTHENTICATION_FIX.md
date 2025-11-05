# Admin Authentication Fix - Implementation Guide

## Problem Description

Admin users who attempted to login using mobile OTP authentication were experiencing an issue where, despite successful authentication, the UI still displayed "Sign In" instead of recognizing them as logged in.

## Root Cause Analysis

Grace Companion has **two separate authentication systems**:

1. **Regular User Authentication** (Elders & Next of Kin)
   - Uses phone number + OTP verification
   - Login page: `/login`
   - Authenticates via `verify-otp` Edge Function
   - Profile stored in `users` table

2. **Admin Authentication** (System Administrators)
   - Uses email + password authentication
   - Login page: `/admin/login`
   - Authenticates via Supabase `auth.signInWithPassword()`
   - Profile stored in both `admin_users` AND `users` tables

### The Issue

When an admin used OTP login (intended for regular users), the following occurred:

1. The OTP was verified successfully
2. Supabase Auth created a session
3. The `authContext.tsx` tried to fetch the profile from the `users` table
4. Admin accounts often had incomplete or missing entries in the `users` table
5. Without a valid profile, the UI couldn't recognize the authenticated user
6. Result: "Sign In" button remained even though the user was authenticated

## Solution Implemented

### 1. Database Synchronization (Migration: `20251205000000_fix_admin_authentication_sync.sql`)

**Created automatic sync trigger:**
```sql
CREATE TRIGGER trigger_sync_admin_user_to_users
  AFTER INSERT OR UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_user_to_users_table();
```

This ensures that whenever an admin account is created or updated in `admin_users`, the corresponding entry in `users` table is automatically created/updated with:
- Correct `role` set to 'admin'
- Phone number synchronized
- Name and email synchronized
- `phone_verified` set to true

**Created admin detection function:**
```sql
CREATE FUNCTION check_if_admin_by_phone(p_phone text)
```

This function checks if a phone number belongs to an admin account and is used by the OTP verification process to prevent admin OTP logins.

**Created audit and fix function:**
```sql
CREATE FUNCTION audit_and_fix_admin_accounts()
```

This function scans all existing admin accounts and fixes any synchronization issues between `admin_users`, `users`, and `auth.users` tables.

### 2. OTP Verification Protection (Updated: `verify-otp/index.ts`)

Added admin detection check before processing OTP verification:

```typescript
const { data: adminCheck } = await supabase
  .rpc('check_if_admin_by_phone', { p_phone: phoneNumber });

if (adminCheck && adminCheck.is_admin) {
  return new Response(
    JSON.stringify({
      error: 'Admin Account Detected',
      message: 'Admin users must sign in using email and password at /admin/login',
      redirect: '/admin/login',
      is_admin: true,
    }),
    { status: 403 }
  );
}
```

This prevents admins from using OTP login and provides clear guidance.

### 3. Enhanced Auth Context (Updated: `authContext.tsx`)

Updated the `fetchProfile` function to:
1. Check both `users` and `admin_users` tables
2. Prioritize admin data if found
3. Set `is_admin` and `admin_role` properties
4. Handle missing profiles gracefully

```typescript
async function fetchProfile(userId: string) {
  // Fetch from users table
  const { data: userData } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', userId)
    .maybeSingle();

  // Check if user is an admin
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('id, full_name, email, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  // Merge admin data if exists
  if (adminData && adminData.is_active) {
    setProfile({
      id: userId,
      name: adminData.full_name,
      email: adminData.email,
      role: 'admin',
      is_admin: true,
      admin_role: adminData.role,
    });
  }
}
```

### 4. Login Page Updates (Updated: `app/login/page.tsx`)

**Added admin detection and redirect:**
```typescript
catch (err: any) {
  if (err.message && err.message.includes('Admin Account Detected')) {
    setError('This phone number belongs to an admin account. Redirecting...');
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 2000);
  }
}
```

**Added admin portal link:**
```tsx
<Link href="/admin/login">
  <Button variant="outline" className="w-full rounded-[12px]">
    <Shield className="w-4 h-4 mr-2" />
    Admin Portal Login
  </Button>
</Link>
```

### 5. Homepage Updates (Updated: `app/page.tsx`)

**Added admin badge display:**
```tsx
{profile?.is_admin && (
  <div className="relative flex justify-center mb-3">
    <span className="inline-flex items-center px-4 py-1 rounded-full">
      <Shield className="w-4 h-4 mr-2" />
      System Administrator
    </span>
  </div>
)}
```

**Added admin portal quick access:**
```tsx
{profile?.is_admin && (
  <Link href="/admin/monitoring">
    <Button variant="outline">
      <Shield className="w-5 h-5 mr-2" />
      Admin Portal
    </Button>
  </Link>
)}
```

## How to Apply the Fix

### For Existing Admin Accounts

If you're an admin who experienced this issue, run the following SQL in Supabase SQL Editor:

```sql
-- Fix all existing admin accounts
SELECT audit_and_fix_admin_accounts();
```

This will:
- Check all admin accounts
- Create missing `users` table entries
- Fix incorrect role assignments
- Synchronize phone numbers across tables
- Return a detailed report of issues found and fixed

### For New Admin Accounts

New admin accounts created after this fix will automatically:
- Have synchronized entries in all three tables (`auth.users`, `users`, `admin_users`)
- Have the correct role set to 'admin' in the `users` table
- Have phone verification properly configured
- Be blocked from using OTP login

## Testing the Fix

### Test 1: Admin OTP Login Prevention
1. Go to `/login`
2. Enter an admin's phone number
3. Request OTP code
4. Enter the code
5. **Expected Result**: Error message: "Admin Account Detected" with redirect to `/admin/login`

### Test 2: Admin Email/Password Login
1. Go to `/admin/login`
2. Enter admin email and password
3. Click "Sign In"
4. **Expected Result**: Successfully redirected to `/admin/monitoring`

### Test 3: Admin Profile Display
1. Login as admin (email/password)
2. Navigate to homepage (`/`)
3. **Expected Result**:
   - "System Administrator" badge visible
   - "Admin Portal" button in top-right corner
   - Greeting shows admin's name
   - No "Sign In" button visible

### Test 4: Regular User OTP Login
1. Go to `/login`
2. Enter a non-admin phone number
3. Complete OTP verification
4. **Expected Result**: Successfully logged in, homepage displays normally

## Maintenance

### Regular Checks

Run the audit function periodically to ensure data consistency:

```sql
SELECT audit_and_fix_admin_accounts();
```

### Manual Admin Setup

To manually set up an admin account with phone authentication:

```sql
SELECT setup_admin_user_phone(
  'admin@example.com',  -- Admin email
  '+44XXXXXXXXXX'       -- Admin phone number
);
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Authentication Flow                   │
└─────────────────────────────────────────────────────────┘

Regular Users (Elder/NoK):
  /login → OTP Verification → users table → Homepage

Admin Users:
  /admin/login → Email/Password → admin_users + users → Admin Portal
                                     ↑          ↑
                                     └──────────┘
                                  Automatic Sync
                                  (via trigger)

Protection:
  OTP Login → check_if_admin_by_phone() → Block if admin
```

## Key Files Modified

1. **Database Migration**: `supabase/migrations/20251205000000_fix_admin_authentication_sync.sql`
2. **Edge Function**: `supabase/functions/verify-otp/index.ts`
3. **Auth Context**: `lib/authContext.tsx`
4. **Login Page**: `app/login/page.tsx`
5. **Homepage**: `app/page.tsx`

## Benefits of This Fix

1. **Prevents Confusion**: Admins are immediately directed to the correct login portal
2. **Data Consistency**: All admin accounts have synchronized profiles across tables
3. **Better UX**: Clear visual indicators when logged in as admin
4. **Security**: Maintains separation between user and admin authentication
5. **Maintainability**: Automatic synchronization reduces manual intervention
6. **Debugging**: Audit function provides detailed reports of any issues

## Support

If you encounter authentication issues after this fix:

1. Run the audit function: `SELECT audit_and_fix_admin_accounts();`
2. Check the admin entry exists: `SELECT * FROM admin_users WHERE email = 'your@email.com';`
3. Verify users table entry: `SELECT * FROM users WHERE id = 'your-user-id';`
4. Check auth.users phone: `SELECT phone FROM auth.users WHERE email = 'your@email.com';`

If issues persist, review the sync trigger logs and ensure RLS policies are correctly configured.
