# Push Notification System Setup Guide

This guide explains how to configure and use the push notification system in Grace Companion.

## Overview

The push notification system enables real-time alerts for:
- Medication reminders
- Wellness check-ins
- Emergency alerts
- Family messages
- Incident notifications

## Prerequisites

- Supabase account with database access
- VAPID keys for Web Push API
- HTTPS-enabled domain (required for push notifications)

## Setup Instructions

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for sending push notifications.

```bash
npx web-push generate-vapid-keys
```

This will output:
```json
{
  "publicKey": "BLUxz971UwQotSYvBGJSEdFFJR_jVLn024ANyy2cfFcKNYu-toNJD2vFgWoqA7jjWEMMMRK2Ayuwot0sCnENP-8",
  "privateKey": "vZ8NCKowpelp-3vRUcnr2XYGH5WYm1WYsm8EoxLS33M"
}
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Push Notifications (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

**Important:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Must start with `NEXT_PUBLIC_` to be accessible in the browser
- `VAPID_PRIVATE_KEY` - Keep this secret, server-side only
- `VAPID_SUBJECT` - Use your support email address

### 3. Configure Supabase Edge Function Environment Variables

In your Supabase dashboard, add these environment variables to your Edge Functions:

```bash
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

### 4. Database Tables

The following tables are automatically created via migrations:

- `push_subscriptions` - Stores user device push subscriptions
- `notification_preferences` - User notification settings
- `notification_log` - Audit trail of all notifications sent
- `scheduled_notifications` - Scheduled/recurring notifications

### 5. Deploy Edge Functions

Deploy the push notification Edge Functions:

```bash
# Deploy send-push-notification function
supabase functions deploy send-push-notification

# Deploy notification-scheduler function
supabase functions deploy notification-scheduler
```

### 6. Setup Cron Job for Scheduled Notifications

Configure a cron job to run the notification scheduler every 5 minutes:

1. Go to Supabase Dashboard → Edge Functions → Cron Jobs
2. Create new cron job:
   - Function: `notification-scheduler`
   - Schedule: `*/5 * * * *` (every 5 minutes)

## Usage

### Enable Notifications for a User

```typescript
import { requestNotificationPermission, subscribeToPushNotifications } from '@/lib/pushNotifications';

// Request permission
const permission = await requestNotificationPermission();

if (permission === 'granted') {
  // Subscribe to push notifications
  const subscription = await subscribeToPushNotifications(userId);
  console.log('Subscribed to push notifications:', subscription);
}
```

### Schedule a Medication Reminder

```typescript
import { scheduleMedicationReminder } from '@/lib/notificationScheduler';

await scheduleMedicationReminder(
  userId,
  'Aspirin',
  '100mg',
  new Date('2024-11-06T09:00:00'),
  true // isRecurring
);
```

### Send Emergency Alert

```typescript
import { sendEmergencyAlert } from '@/lib/notificationScheduler';

await sendEmergencyAlert(
  residentId,
  'Fall Detected',
  'critical',
  ['fall', 'help'],
  { location: 'Bedroom' }
);
```

### Configure User Notification Preferences

Users can customize their notification preferences at `/settings/notifications`:

- Enable/disable specific notification types
- Set quiet hours (no notifications during specified times)
- Adjust vibration intensity
- Choose notification sounds

## Notification Action Handlers

The service worker handles various notification actions:

### Medication Reminders
- **Taken** - Marks medication as taken and logs it
- **Snooze** - Reschedules reminder for 15 minutes later

### Emergency Alerts
- **Call Now** - Opens phone dialer with emergency contact
- **View Details** - Opens the app to the incidents page

### Default Behavior
- Clicking a notification opens the app and navigates to the relevant page

## Testing Notifications

### Test Push Notification

```typescript
import { showLocalNotification } from '@/lib/pushNotifications';

await showLocalNotification('Test Notification', {
  body: 'This is a test notification',
  icon: '/icon-192.png',
  requireInteraction: true,
  vibrate: [200, 100, 200]
});
```

### Check Notification Logs

Query the `notification_log` table to see all notifications sent:

```sql
SELECT * FROM notification_log
WHERE user_id = 'user-uuid'
ORDER BY sent_at DESC
LIMIT 10;
```

## Troubleshooting

### Notifications Not Appearing

1. **Check browser permission:** Ensure notification permission is granted
2. **Check VAPID keys:** Verify environment variables are set correctly
3. **Check HTTPS:** Push notifications require HTTPS (except on localhost)
4. **Check subscription:** Verify user has an active push subscription
5. **Check quiet hours:** User may have quiet hours enabled
6. **Check preferences:** User may have disabled specific notification types

### Expired Subscriptions

The system automatically marks subscriptions as inactive when:
- HTTP 410 (Gone) - Subscription expired
- HTTP 404 (Not Found) - Subscription doesn't exist

### Debug Logs

Check service worker console for detailed logs:
```javascript
// In browser console
navigator.serviceWorker.ready.then(registration => {
  console.log('Service Worker:', registration);
});
```

## Browser Support

Push notifications are supported in:
- Chrome/Edge 50+
- Firefox 44+
- Safari 16+ (macOS 13+, iOS 16.4+)
- Opera 37+

**Note:** iOS Safari requires iOS 16.4+ and only supports push notifications for installed PWAs.

## Security Considerations

1. **VAPID Keys:** Never expose private key in client-side code
2. **User Consent:** Always request permission before subscribing
3. **Data Privacy:** Notification content may be visible in notification center
4. **Opt-out:** Always provide easy way to unsubscribe
5. **Rate Limiting:** Implement to prevent notification spam

## Performance Tips

1. **Batch Notifications:** Group similar notifications when possible
2. **Use Tags:** Replace old notifications with same tag
3. **TTL:** Set appropriate Time-To-Live for notifications
4. **Cleanup:** Remove inactive subscriptions regularly

## Production Checklist

- [ ] VAPID keys generated and configured
- [ ] Environment variables set in both Next.js and Supabase
- [ ] Edge Functions deployed
- [ ] Cron job configured for notification scheduler
- [ ] HTTPS enabled on production domain
- [ ] Service worker registered successfully
- [ ] Notification icons created
- [ ] User preferences UI implemented
- [ ] Analytics/logging configured
- [ ] Rate limiting implemented

## Support

For issues or questions:
- Check service worker console for errors
- Review notification logs in database
- Test with browser developer tools
- Verify VAPID key configuration

## Additional Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
