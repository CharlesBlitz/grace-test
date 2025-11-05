# Resend Email Setup Guide

## Quick Setup Steps

### Step 1: Configure Supabase SMTP (Required for Password Reset)

1. Open your Supabase Project Dashboard: https://supabase.com/dashboard
2. Go to **Authentication → Email Templates**
3. Click on the **SMTP Settings** tab
4. Toggle **Enable Custom SMTP** to ON
5. Fill in the following settings:

```
SMTP Host: smtp.resend.com
SMTP Port: 465
Username: resend
Password: re_ek3nSppD_8iURd3UdR5KCjkKCrohSEyoA
Sender email: notifications@grace-companion.com
Sender name: Grace Companion
```

6. Click **Save**
7. Click **Send Test Email** to verify it works

### Step 2: Add Environment Variable to Netlify

1. Go to your Netlify Dashboard
2. Select your site
3. Go to **Site Settings → Environment Variables**
4. Add new variable:
   - **Key:** `RESEND_API_KEY`
   - **Value:** `re_ek3nSppD_8iURd3UdR5KCjkKCrohSEyoA`
   - **Scopes:** All (or at least "Builds" and "Functions")
5. Click **Save**
6. Trigger a new deploy

### Step 3: Customize Email Templates (Optional but Recommended)

1. In Supabase Dashboard, go to **Authentication → Email Templates**
2. Customize these templates:
   - **Confirm signup** (for email verification)
   - **Reset password** (for password reset)
   - **Magic Link** (if using magic link auth)

#### Recommended Password Reset Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
    </div>

    <div class="content">
      <p>Hi there,</p>

      <p>We received a request to reset the password for your Grace Companion account associated with <strong>{{ .Email }}</strong>.</p>

      <p>Click the button below to create a new password:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
      </div>

      <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
        <strong>Important:</strong><br>
        • This link will expire in 1 hour for security reasons<br>
        • If you didn't request this reset, you can safely ignore this email<br>
        • Your password will not change until you click the link above and create a new one
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0;">
        <strong>Grace Companion</strong><br>
        Care Management Platform
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px;">
        © {{ .Year }} Grace Companion. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
```

3. Click **Save** for each template you customize

## Testing

### Test Password Reset Email

1. Go to your deployed app: `https://your-site.netlify.app/organization/forgot-password`
2. Enter a valid email address from your users table
3. Click "Send Reset Link"
4. Check the email inbox for the reset email
5. Verify the email comes from `notifications@grace-companion.com`
6. Click the reset link and verify it works

### Test Family Care Emails

1. Log in to the organization dashboard
2. Navigate to a resident's profile
3. Send a test daily note or wellness report
4. Verify family members receive the email

## Troubleshooting

### Emails Not Arriving

1. **Check Spam Folder** - Resend emails may initially go to spam
2. **Verify SMTP Settings** - Make sure all settings are exactly as shown
3. **Check Resend Dashboard** - Log in to https://resend.com/emails to see delivery status
4. **Verify Domain** - Ensure grace-companion.com is verified in Resend
5. **Check Rate Limits** - Free tier: 100 emails/day, 3000/month

### Password Reset Link Not Working

1. Verify `SITE_URL` is set correctly in Netlify environment variables
2. Check Supabase Auth settings → URL Configuration → Redirect URLs
3. Make sure the redirect URL includes your production domain

### Emails Look Wrong

1. Check HTML template syntax in Supabase
2. Test with different email clients (Gmail, Outlook, etc.)
3. Use Resend's preview feature to test templates

## Support Resources

- **Resend Dashboard:** https://resend.com/
- **Resend Documentation:** https://resend.com/docs
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Email Template Variables:** https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr

## Next Steps

After setup:
1. Send test emails to verify everything works
2. Consider upgrading Resend plan if you expect >100 emails/day
3. Monitor email delivery in Resend dashboard
4. Customize email templates to match your branding
5. Set up email analytics and tracking if needed
