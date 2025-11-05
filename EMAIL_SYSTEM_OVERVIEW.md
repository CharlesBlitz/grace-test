# Email System Overview

## All Emails Use Resend

Your Grace Companion application now uses **Resend** for ALL email communications.

## Email Types

### 1. Authentication Emails (via Supabase SMTP)

These emails are sent automatically by Supabase Auth and use Resend via custom SMTP configuration:

- **Password Reset** - When users click "Forgot Password"
- **Email Verification** - When new users sign up (if enabled)
- **Magic Links** - For passwordless authentication (if enabled)
- **Email Change Confirmation** - When users update their email

**Configuration:** Set up in Supabase Dashboard → Authentication → SMTP Settings

**Sender:** `notifications@grace-companion.com`

---

### 2. Care Communication Emails (via Edge Functions)

These emails are sent by your application's Edge Functions and use Resend API directly:

#### Family Communication Emails
- **Daily Care Notes** - Updates about resident's daily activities
- **Incident Reports** - Urgent notifications about incidents
- **Weekly Wellness Summaries** - Comprehensive weekly health reports
- **Care Plan Updates** - When care plans are modified
- **Assessment Results** - Results from health assessments

**Edge Function:** `send-family-email`
**Sender:** `{Organization Name} <notifications@grace-companion.com>`

#### Wellness Reports
- **Automated Weekly Reports** - Sent every week to family members
- **On-Demand Reports** - Sent when requested by staff

**Edge Function:** `send-wellness-report-email`
**Sender:** `{Organization Name} <notifications@grace-companion.com>`

---

## Email Flow Diagram

```
User Action → Application → Email Provider → Recipient
                           ↓
                    ┌──────┴──────┐
                    │             │
            Password Reset   Family Updates
                    │             │
              Supabase Auth   Edge Function
                    │             │
              (via SMTP)      (via API)
                    │             │
                    └──────┬──────┘
                           ↓
                      RESEND
                           ↓
                     Recipient's Inbox
```

---

## Email Preferences & Consent

### Family Email Preferences
Family members can control which emails they receive via the `family_email_preferences` table:

- `can_receive_daily_notes` - Daily activity updates
- `can_receive_incident_reports` - Urgent incident notifications
- `can_receive_weekly_summaries` - Weekly wellness summaries
- `can_receive_care_plan_updates` - Care plan changes
- `can_receive_assessment_results` - Assessment outcomes

### Consent Management
- All emails respect consent settings
- Recipients can revoke consent at any time
- Consent revocation is tracked with `consent_revoked_at` timestamp

---

## Email Delivery Logging

All application emails (not auth emails) are logged in the `email_delivery_logs` table:

```sql
- organization_id
- sender_user_id
- recipient_email
- recipient_name
- resident_id
- email_type
- subject
- has_attachments
- delivery_status
- sent_at
```

This allows you to:
- Track all email communications
- Audit delivery history
- Troubleshoot delivery issues
- Comply with regulations

---

## Email Templates

### Professional HTML Templates
All emails use responsive, mobile-optimized HTML templates featuring:
- Organization branding
- Beautiful color schemes
- Clear call-to-action buttons
- Mobile-friendly design
- Professional typography

### Customization
- **Auth Emails**: Customize in Supabase Dashboard → Email Templates
- **Care Emails**: Edit Edge Function code in `supabase/functions/`

---

## Monitoring & Analytics

### Resend Dashboard
Monitor email delivery at: https://resend.com/emails

View:
- Delivery status
- Open rates (if enabled)
- Click rates (if enabled)
- Bounce rates
- Error logs

### Application Logs
Query the `email_delivery_logs` table for:
- Historical delivery data
- Per-organization metrics
- Per-resident communication history

---

## Rate Limits

### Resend Free Tier
- **100 emails per day**
- **3,000 emails per month**

### Recommended Usage
- For small facilities: Free tier is sufficient
- For large facilities (100+ residents): Consider paid plan
- Monitor usage in Resend dashboard

### Paid Plans
Visit https://resend.com/pricing for:
- Higher volume limits
- Priority support
- Advanced analytics
- Dedicated IP addresses

---

## Security & Compliance

### Data Protection
- All email content is encrypted in transit (TLS)
- No email content is stored by Resend after delivery
- Delivery logs stored in your Supabase database

### GDPR Compliance
- Recipients can opt-out of email types
- Consent is tracked and respected
- Personal data handling is documented

### CQC Compliance
- All family communications are logged
- Audit trail maintained in database
- Timestamps recorded for all deliveries

---

## Troubleshooting

### Common Issues

**Emails going to spam:**
- Add grace-companion.com to recipient's safe sender list
- Warm up your domain by starting with low volumes
- Avoid spam trigger words in content

**Emails not delivered:**
- Check Resend dashboard for delivery status
- Verify recipient email address is correct
- Check rate limits haven't been exceeded

**Password reset not working:**
- Verify SMTP settings in Supabase are correct
- Check Supabase Auth logs for errors
- Ensure redirect URLs are configured

---

## Support

For email-related issues:

**Resend Issues:**
- Dashboard: https://resend.com/
- Docs: https://resend.com/docs
- Support: support@resend.com

**Supabase Auth Issues:**
- Docs: https://supabase.com/docs/guides/auth
- Support: Via Supabase Dashboard

**Application Issues:**
- Check Edge Function logs in Supabase
- Review `email_delivery_logs` table
- Check browser console for errors
