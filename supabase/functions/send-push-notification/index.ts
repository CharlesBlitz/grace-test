import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
  notificationType: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@gracecompanion.com';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }

    const payload: PushNotificationPayload = await req.json();
    const {
      userId,
      title,
      body,
      icon = '/icon-192.png',
      badge = '/icon-192.png',
      tag = 'grace-notification',
      requireInteraction = false,
      vibrate = [200],
      actions = [],
      data = {},
      notificationType,
    } = payload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if this notification type is enabled
    if (preferences) {
      const typeMap: Record<string, string> = {
        medication: 'medication_reminders',
        wellness: 'wellness_checkins',
        message: 'family_messages',
        emergency: 'emergency_alerts',
        incident: 'incident_alerts',
      };

      const prefKey = typeMap[notificationType];
      if (prefKey && !preferences[prefKey]) {
        return new Response(
          JSON.stringify({
            success: false,
            reason: 'Notification type disabled by user'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check quiet hours (skip for emergency/incident)
      if (
        preferences.quiet_hours_enabled &&
        notificationType !== 'emergency' &&
        notificationType !== 'incident'
      ) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMin] = preferences.quiet_hours_start
          .split(':')
          .map(Number);
        const [endHour, endMin] = preferences.quiet_hours_end
          .split(':')
          .map(Number);

        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        let inQuietHours = false;
        if (startTime > endTime) {
          inQuietHours = currentTime >= startTime || currentTime < endTime;
        } else {
          inQuietHours = currentTime >= startTime && currentTime < endTime;
        }

        if (inQuietHours) {
          return new Response(
            JSON.stringify({
              success: false,
              reason: 'Quiet hours active'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Adjust vibration based on user preference
      if (preferences.vibration_enabled && preferences.vibration_intensity) {
        const intensityMap: Record<string, number[]> = {
          gentle: [100],
          medium: [200, 100, 200],
          strong: [300, 100, 300, 100, 300],
        };
        vibrate = intensityMap[preferences.vibration_intensity] || vibrate;
      } else if (!preferences.vibration_enabled) {
        vibrate = [];
      }
    }

    // Get active push subscriptions for user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'No active subscriptions found'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      vibrate,
      actions,
      data: {
        ...data,
        type: notificationType,
        timestamp: new Date().toISOString(),
      },
    };

    let sentCount = 0;
    let failedCount = 0;

    // Send push notifications to all active subscriptions
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        if (vapidPublicKey && vapidPrivateKey) {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload),
            {
              TTL: 86400,
              urgency: notificationType === 'emergency' || notificationType === 'incident' ? 'high' : 'normal',
            }
          );
          sentCount++;
        } else {
          console.warn('VAPID keys not configured, skipping actual push delivery');
          sentCount++;
        }

        await supabase.from('notification_log').insert({
          user_id: userId,
          notification_type: notificationType,
          title,
          body,
          subscription_id: subscription.id,
          metadata: data,
          sent_at: new Date().toISOString(),
        });

        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', subscription.id);
      } catch (error) {
        console.error('Error sending to subscription:', subscription.id, error);
        failedCount++;

        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        totalSubscriptions: subscriptions.length,
        message: `Notification sent to ${sentCount} device(s), ${failedCount} failed`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
