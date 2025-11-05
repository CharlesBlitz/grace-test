# Grace Companion Reminder System Guide

## Overview

The Grace Companion reminder system provides automated SMS, phone call, push notification, and email reminders for elders, with intelligent escalation to family members when reminders are missed. The system uses Twilio for SMS/voice delivery and ElevenLabs for voice cloning capabilities.

## System Architecture

### Components

1. **Database Tables**
   - `care_tasks` - Stores reminder tasks with delivery preferences
   - `reminder_schedule` - Defines when reminders should be sent
   - `notification_log` - Tracks all notification delivery attempts
   - `escalation_contacts` - Emergency contacts for missed reminder alerts

2. **Edge Functions**
   - `send-reminder` - Sends individual reminders via SMS or phone call
   - `reminder-scheduler` - Cron job that checks for due reminders every minute
   - `escalation-alert` - Alerts family members when thresholds are exceeded

3. **User Interfaces**
   - `/nok-dashboard/reminders` - Create and manage reminders
   - `/nok-dashboard/escalation` - Manage emergency contact list
   - `/reminders` - Elder view of daily tasks

## How It Works

### For Next of Kin (NOK)

1. **Creating Reminders**
   - Navigate to NOK Dashboard → Manage Reminders
   - Click "Create Reminder"
   - Fill in:
     - Title (e.g., "Take morning medication")
     - Type (medication, hydration, exercise, custom)
     - Delivery methods (SMS, call, push, email)
     - Voice preferences (cloned or standard TTS)
     - Escalation threshold (missed attempts before alert)
     - Schedule (times and days)

2. **Setting Up Emergency Contacts**
   - Navigate to NOK Dashboard → Emergency Contacts
   - Add contacts with:
     - Name and contact information
     - Priority order (1 = first to be contacted)
     - Preferred notification methods
   - Contacts are alerted in priority order when escalation threshold is reached

### For Elders

1. **Receiving Reminders**
   - **SMS**: Text messages arrive at scheduled times
   - **Phone Call**: Automated calls with voice message
   - **App Notifications**: Push notifications when app is installed
   - **In-App**: View reminders on the reminders page

2. **Completing Tasks**
   - Open the app and go to "Reminders"
   - Tap "Done" button for completed tasks
   - Completion resets the missed reminder counter

3. **Voice Interaction**
   - Use "Talk to Me" feature to confirm task completion
   - Say things like "I took my medication" or "I drank water"
   - Grace will update task status automatically

### Phone Integration

The app works on phones through multiple mechanisms:

1. **Progressive Web App (PWA)**
   - Install the app from browser menu ("Add to Home Screen")
   - Works like a native app once installed
   - Receives push notifications in the background
   - Works offline for viewing scheduled reminders

2. **SMS Integration**
   - Reminders sent via Twilio SMS
   - No app installation required
   - Works on any phone that can receive text messages
   - Elders can reply to confirm (optional feature)

3. **Phone Call Integration**
   - Automated calls via Twilio Voice
   - Uses text-to-speech or cloned voice
   - No smartphone required
   - Works on landlines and basic phones

## Voice Cloning

When voice cloning is enabled:

1. **Setup** (done during NOK registration)
   - NOK records 3 voice samples
   - System creates ElevenLabs voice profile
   - Voice ID is stored in database

2. **Usage**
   - Select "Use cloned voice" when creating reminder
   - Choose which family member's voice to use
   - System generates audio using ElevenLabs API
   - Audio is played during phone call reminders

3. **Fallback**
   - If voice cloning fails, system uses standard TTS
   - Ensures reminders are always delivered

## Escalation Process

When an elder misses reminders:

1. **Tracking**
   - Each missed reminder increments counter
   - Counter resets when task is completed
   - Counter resets at midnight each day

2. **Threshold**
   - Default: 3 missed attempts triggers escalation
   - Configurable per reminder
   - NOK can set different thresholds for critical vs. routine tasks

3. **Alert Sequence**
   - System fetches escalation contacts for the elder
   - Contacts are sorted by priority order
   - Each contact is alerted via their preferred methods
   - 1-second delay between contacts to prevent overwhelming

4. **Alert Content**
   - SMS: "ALERT: [Elder] has missed [N] reminders for [Task]. Please check on them."
   - Call: Voice message with same information
   - Includes Grace Companion branding for context

## Required Environment Variables

The system requires these credentials (automatically configured in Supabase):

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## Setting Up Automated Scheduling

The reminder scheduler must be triggered every minute. Options:

### Option 1: External Cron Service (Recommended)
Use a service like cron-job.org or EasyCron:
```
URL: https://[your-project].supabase.co/functions/v1/reminder-scheduler
Method: POST
Schedule: */1 * * * * (every minute)
Headers: Authorization: Bearer [anon-key]
```

### Option 2: Supabase Cron (if available)
```sql
SELECT cron.schedule(
  'process-reminders',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[your-project].supabase.co/functions/v1/reminder-scheduler',
    headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb
  )
  $$
);
```

## Testing the System

### Manual Testing

1. **Create a Test Reminder**
   - Set schedule for 2 minutes in the future
   - Use your own phone number
   - Choose SMS delivery method
   - Set escalation threshold to 1

2. **Verify Delivery**
   - Wait for scheduled time
   - Check that SMS arrives
   - Verify notification appears in log

3. **Test Escalation**
   - Don't complete the reminder
   - Wait for next scheduled time
   - Verify escalation alert is sent

### Database Queries for Monitoring

```sql
-- Check recent notifications
SELECT * FROM notification_log
ORDER BY created_at DESC
LIMIT 20;

-- Check tasks due for escalation
SELECT * FROM care_tasks
WHERE reminder_attempts >= escalation_threshold
AND escalated_at IS NULL;

-- View active schedules
SELECT
  rs.*,
  ct.title,
  u.name as elder_name
FROM reminder_schedule rs
JOIN care_tasks ct ON rs.task_id = ct.id
JOIN users u ON ct.elder_id = u.id
WHERE rs.active = true;
```

## Troubleshooting

### Reminders Not Sending

1. Check Twilio credentials are configured
2. Verify phone number includes country code (+1 for US)
3. Check notification_log table for error messages
4. Ensure reminder scheduler is running every minute

### Voice Cloning Not Working

1. Verify ElevenLabs API key is set
2. Check that voice profile has elevenlabs_voice_id
3. Review send-reminder logs for errors
4. System will fall back to standard TTS if cloning fails

### Escalation Alerts Not Triggering

1. Verify escalation_contacts table has active contacts
2. Check that escalation_threshold is set on tasks
3. Confirm reminder_attempts counter is incrementing
4. Review escalation-alert function logs

## Best Practices

### For NOK

1. **Phone Numbers**
   - Always include country code (e.g., +12345678901)
   - Test with a single SMS before bulk setup
   - Keep emergency contact list updated

2. **Reminder Frequency**
   - Don't over-schedule (causes reminder fatigue)
   - Space reminders at least 30 minutes apart
   - Use daily reminders for routine tasks

3. **Escalation Thresholds**
   - Set lower thresholds (1-2) for critical medications
   - Use higher thresholds (3-5) for routine tasks
   - Consider elder's routine when setting times

4. **Voice Preferences**
   - Test cloned voice quality before production use
   - Standard TTS is more reliable for critical reminders
   - Consider elder's hearing ability

### For System Administrators

1. **Monitoring**
   - Set up alerts for high failure rates
   - Monitor Twilio usage and costs
   - Review notification logs weekly

2. **Performance**
   - Keep reminder schedules optimized
   - Archive old notification logs quarterly
   - Monitor Edge Function execution times

3. **Cost Management**
   - SMS costs ~$0.01 per message
   - Voice calls cost ~$0.02 per minute
   - ElevenLabs charges per character
   - Set up Twilio spending limits

## Privacy and Compliance

1. **Data Retention**
   - Notification logs are kept for audit purposes
   - GDPR compliance requires data deletion on request
   - Voice recordings are deleted after 90 days

2. **Security**
   - All phone numbers are encrypted at rest
   - RLS policies restrict data access
   - Twilio credentials stored as secrets

3. **Consent**
   - Elder or guardian consent required for all communications
   - Consent timestamps recorded in database
   - Opt-out mechanisms available

## Future Enhancements

Potential improvements to consider:

1. Two-way SMS (elder can reply "done" to confirm)
2. Integration with health devices (automatic completion)
3. Machine learning for optimal reminder timing
4. Video call reminders
5. Integration with medication dispensers
6. Geofencing-based reminders
7. Weather-based reminder adjustments
8. Multi-language support
9. Custom TTS voice selection
10. Reminder analytics dashboard
