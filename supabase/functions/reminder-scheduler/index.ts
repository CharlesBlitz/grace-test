import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(`Checking reminders at ${currentTime} on day ${currentDay}`);

    const schedulesResponse = await fetch(
      `${supabaseUrl}/rest/v1/reminder_schedule?active=eq.true&select=*,care_tasks(*)`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!schedulesResponse.ok) {
      throw new Error('Failed to fetch schedules');
    }

    const schedules = await schedulesResponse.json();
    const dueSchedules = schedules.filter((schedule: any) => {
      if (!schedule.care_tasks) return false;

      const scheduleDay = schedule.day_of_week;
      if (scheduleDay !== null && scheduleDay !== currentDay) {
        return false;
      }

      const scheduleTime = schedule.time_of_day;
      const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);

      return scheduleHour === currentHour && scheduleMinute === currentMinute;
    });

    console.log(`Found ${dueSchedules.length} due reminders`);

    const results = [];

    for (const schedule of dueSchedules) {
      const task = schedule.care_tasks;

      const userResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${task.elder_id}&select=*`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );

      if (!userResponse.ok) {
        console.error(`Failed to fetch user ${task.elder_id}`);
        continue;
      }

      const users = await userResponse.json();
      if (users.length === 0) {
        console.error(`User not found: ${task.elder_id}`);
        continue;
      }

      const elder = users[0];

      if (!elder.phone_number) {
        console.error(`No phone number for elder ${elder.name}`);
        continue;
      }

      const lastCompleted = task.last_completed_at ? new Date(task.last_completed_at) : null;
      const today = new Date();
      const completedToday = lastCompleted &&
        lastCompleted.getDate() === today.getDate() &&
        lastCompleted.getMonth() === today.getMonth() &&
        lastCompleted.getFullYear() === today.getFullYear();

      if (completedToday) {
        console.log(`Task ${task.id} already completed today, skipping`);
        continue;
      }

      const reminderMethods = task.reminder_method || ['sms'];

      for (const method of reminderMethods) {
        if (method !== 'sms' && method !== 'call') {
          continue;
        }

        try {
          const reminderResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-reminder`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                taskId: task.id,
                elderId: task.elder_id,
                elderPhone: elder.phone_number,
                elderName: elder.name,
                reminderMessage: task.title,
                deliveryMethod: method,
                useClonedVoice: task.use_cloned_voice || false,
                voiceProfileId: task.voice_profile_id,
              }),
            }
          );

          const reminderResult = await reminderResponse.json();
          results.push({
            taskId: task.id,
            elderName: elder.name,
            method,
            success: reminderResult.success,
            error: reminderResult.error,
          });

          console.log(`Sent ${method} reminder for task ${task.id}: ${reminderResult.success}`);

          const newAttempts = (task.reminder_attempts || 0) + 1;
          await fetch(
            `${supabaseUrl}/rest/v1/care_tasks?id=eq.${task.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reminder_attempts: newAttempts,
              }),
            }
          );

          if (newAttempts >= task.escalation_threshold && !task.escalated_at) {
            console.log(`Task ${task.id} reached escalation threshold, triggering alert`);

            await fetch(
              `${supabaseUrl}/functions/v1/escalation-alert`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  taskId: task.id,
                  elderId: task.elder_id,
                  elderName: elder.name,
                  taskTitle: task.title,
                  missedAttempts: newAttempts,
                }),
              }
            );

            await fetch(
              `${supabaseUrl}/rest/v1/care_tasks?id=eq.${task.id}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  escalated_at: new Date().toISOString(),
                }),
              }
            );
          }
        } catch (error) {
          console.error(`Error sending ${method} reminder:`, error);
          results.push({
            taskId: task.id,
            elderName: elder.name,
            method,
            success: false,
            error: error.message,
          });
        }
      }
    }

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    if (currentHour === 0 && currentMinute === 0) {
      console.log('Resetting reminder attempts for new day');
      await fetch(
        `${supabaseUrl}/rest/v1/care_tasks?reminder_attempts=gt.0`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reminder_attempts: 0,
            escalated_at: null,
          }),
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedAt: now.toISOString(),
        dueReminders: dueSchedules.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in reminder scheduler:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
