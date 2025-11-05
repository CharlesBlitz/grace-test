# Resend Email Integration

## Overview

Your Grace Companion application now uses Resend for transactional email delivery. Resend is integrated into the existing email edge functions.

## Configuration

### Environment Variables

Add this to your `.env` file (already added):
```
RESEND_API_KEY=re_ek3nSppD_8iURd3UdR5KCjkKCrohSEyoA
```

### Verified Domain

Your domain `grace-companion.com` is verified with Resend and ready to send emails.

### Supabase Auth Emails (Password Reset, Verification)

To use Resend for Supabase authentication emails (password reset, email verification, etc.), you need to configure Custom SMTP in your Supabase dashboard:

1. Go to your Supabase Project Dashboard
2. Navigate to **Authentication → Email Templates**
3. Click on **SMTP Settings** tab
4. Enable Custom SMTP and configure:

```
SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) or 587 (TLS)
SMTP Username: resend
SMTP Password: re_ek3nSppD_8iURd3UdR5KCjkKCrohSEyoA
Sender Email: notifications@grace-companion.com
Sender Name: Grace Companion
```

5. Click **Save** and test the configuration

**Important:** Once configured, all Supabase Auth emails (password resets, email confirmations, magic links) will be sent through Resend automatically.

### Customizing Auth Email Templates

You can customize the password reset and verification email templates in Supabase:

1. In your Supabase Dashboard, go to **Authentication → Email Templates**
2. Select the template you want to customize (e.g., "Reset Password")
3. Edit the HTML template to match your branding
4. Use these variables in your templates:
   - `{{ .ConfirmationURL }}` - Password reset link
   - `{{ .SiteURL }}` - Your application URL
   - `{{ .Email }}` - User's email address

Example customized password reset template:
```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>We received a request to reset your password for your Grace Companion account.</p>
<p>Click the button below to reset your password:</p>
<a href="{{ .ConfirmationURL }}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>This link will expire in 1 hour.</p>
<p>Best regards,<br>The Grace Companion Team</p>
```

## Email Functions

The following Supabase Edge Functions now use Resend:

### 1. `send-family-email`
Sends care updates to family members including:
- Daily notes
- Incident reports
- Weekly summaries
- Care plan updates
- Assessment results

**Usage:**
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/send-family-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId: 'org-id',
    senderId: 'user-id',
    residentId: 'resident-id',
    recipientEmail: 'family@example.com',
    recipientName: 'John Doe',
    emailType: 'daily_note',
    subject: 'Daily Care Update',
    content: '<p>Your loved one had a great day...</p>',
    attachmentUrl: 'https://...' // optional
  })
});
```

### 2. `send-wellness-report-email`
Sends weekly wellness summaries to family members.

**Usage:**
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/send-wellness-report-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    summaryId: 'wellness-summary-id',
    organizationId: 'org-id'
  })
});
```

## Email Templates

Both functions use professionally designed HTML email templates with:
- Responsive design
- Organization branding
- Beautiful formatting
- Mobile-optimized layout

### From Address

All emails are sent from:
```
{Organization Name} <notifications@grace-companion.com>
```

## Features

1. **Email Preferences Respected**
   - Checks family member consent before sending
   - Respects opt-out preferences per email type
   - Tracks delivery status

2. **Delivery Logging**
   - All emails logged to `email_delivery_logs` table
   - Tracks success/failure status
   - Records recipient information

3. **Error Handling**
   - Graceful error handling
   - Detailed error messages
   - Automatic retry logic (via Resend)

## Testing

You can test email delivery by:

1. Using the organization dashboard to send test emails
2. Creating wellness summaries and sending to family
3. Triggering incident reports

## Netlify Configuration

Make sure to add to your Netlify environment variables:
```
RESEND_API_KEY=re_ek3nSppD_8iURd3UdR5KCjkKCrohSEyoA
```

## Monitoring

Monitor email delivery through:
1. Resend Dashboard: https://resend.com/emails
2. Database: Query `email_delivery_logs` table
3. Edge Function logs in Supabase

## Rate Limits

Resend free tier includes:
- 100 emails per day
- 3,000 emails per month

For production, upgrade to a paid plan at https://resend.com/pricing

## Support

For Resend-specific issues:
- Documentation: https://resend.com/docs
- Dashboard: https://resend.com/
- Support: support@resend.com
