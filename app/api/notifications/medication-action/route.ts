import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reminderId, action, timestamp } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    if (!reminderId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action === 'taken') {
      // Mark medication as taken
      const { error } = await supabase
        .from('medication_tracking')
        .insert({
          elder_id: userId,
          reminder_id: reminderId,
          taken_at: timestamp || new Date().toISOString(),
          status: 'taken',
          source: 'notification_action',
        });

      if (error) {
        console.error('Error logging medication taken:', error);
        return NextResponse.json(
          { error: 'Failed to log medication' },
          { status: 500 }
        );
      }

      // Log activity
      await supabase.from('activity_log').insert({
        elder_id: userId,
        activity_type: 'medication',
        activity_title: 'Medication Taken',
        activity_description: 'Confirmed via notification',
        completed_at: timestamp || new Date().toISOString(),
        icon: 'pill',
        color: 'sky-blue',
      });

      return NextResponse.json({ success: true, action: 'taken' });
    } else if (action === 'snooze') {
      // Reschedule reminder for 15 minutes later
      const { data: reminder } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (reminder) {
        const snoozeTime = new Date(Date.now() + 15 * 60 * 1000);

        await supabase.from('scheduled_notifications').insert({
          user_id: userId,
          notification_type: 'medication',
          title: 'Medication Reminder (Snoozed)',
          body: `Time to take ${reminder.medication_name}`,
          scheduled_for: snoozeTime.toISOString(),
          metadata: { reminder_id: reminderId, snoozed: true },
        });
      }

      return NextResponse.json({ success: true, action: 'snooze' });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in medication-action route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
