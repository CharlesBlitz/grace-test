import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    console.log('Running notification scheduler at:', now.toISOString());

    // Get scheduled notifications that need to be sent
    const { data: scheduledNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .lte('scheduled_for', fiveMinutesFromNow.toISOString())
      .is('sent_at', null)
      .eq('is_cancelled', false)
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      console.error('Error fetching scheduled notifications:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledNotifications?.length || 0} notifications to send`);

    let successCount = 0;
    let errorCount = 0;

    for (const notification of scheduledNotifications || []) {
      try {
        // Send the notification via push notification edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: notification.user_id,
            title: notification.title,
            body: notification.body,
            notificationType: notification.notification_type,
            tag: `scheduled-${notification.id}`,
            data: {
              ...notification.metadata,
              scheduledNotificationId: notification.id,
            },
          }),
        });

        if (response.ok) {
          // Mark notification as sent
          await supabase
            .from('scheduled_notifications')
            .update({ sent_at: now.toISOString() })
            .eq('id', notification.id);

          // Handle recurring notifications
          if (notification.is_recurring && notification.recurrence_pattern) {
            const nextScheduledTime = calculateNextOccurrence(
              notification.scheduled_for,
              notification.recurrence_pattern,
              notification.recurrence_data
            );

            if (nextScheduledTime) {
              // Create next occurrence
              await supabase.from('scheduled_notifications').insert({
                user_id: notification.user_id,
                notification_type: notification.notification_type,
                title: notification.title,
                body: notification.body,
                scheduled_for: nextScheduledTime,
                is_recurring: true,
                recurrence_pattern: notification.recurrence_pattern,
                recurrence_data: notification.recurrence_data,
                metadata: notification.metadata,
              });
            }
          }

          successCount++;
        } else {
          console.error('Failed to send notification:', await response.text());
          errorCount++;
        }
      } catch (error) {
        console.error('Error processing notification:', notification.id, error);
        errorCount++;
      }
    }

    console.log(`Scheduler completed: ${successCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: scheduledNotifications?.length || 0,
        sent: successCount,
        errors: errorCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in notification scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateNextOccurrence(
  currentTime: string,
  pattern: string,
  recurrenceData: any
): string | null {
  const current = new Date(currentTime);

  switch (pattern) {
    case 'daily':
      // Add 1 day
      current.setDate(current.getDate() + 1);
      return current.toISOString();

    case 'weekly':
      // Add 7 days
      current.setDate(current.getDate() + 7);
      return current.toISOString();

    case 'custom':
      // Use recurrence_data for custom patterns
      if (recurrenceData?.intervalDays) {
        current.setDate(current.getDate() + recurrenceData.intervalDays);
        return current.toISOString();
      }
      break;
  }

  return null;
}
