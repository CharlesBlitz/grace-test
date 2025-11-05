// Notification Scheduler Utility
// Handles scheduling of medication reminders, wellness check-ins, and emergency alerts

import { supabase } from './supabaseClient';

export interface ScheduleNotificationParams {
  userId: string;
  notificationType: 'medication' | 'wellness' | 'message' | 'reminder' | 'checkin';
  title: string;
  body: string;
  scheduledFor: Date | string;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'custom';
  recurrenceData?: any;
  metadata?: any;
}

// Schedule a notification
export async function scheduleNotification(params: ScheduleNotificationParams) {
  const {
    userId,
    notificationType,
    title,
    body,
    scheduledFor,
    isRecurring = false,
    recurrencePattern,
    recurrenceData,
    metadata = {},
  } = params;

  try {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        body,
        scheduled_for: typeof scheduledFor === 'string' ? scheduledFor : scheduledFor.toISOString(),
        is_recurring: isRecurring,
        recurrence_pattern: recurrencePattern || null,
        recurrence_data: recurrenceData || null,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in scheduleNotification:', error);
    throw error;
  }
}

// Schedule medication reminder
export async function scheduleMedicationReminder(
  userId: string,
  medicationName: string,
  dosage: string,
  reminderTime: Date,
  isRecurring: boolean = true,
  reminderId?: string
) {
  return scheduleNotification({
    userId,
    notificationType: 'medication',
    title: 'Medication Reminder',
    body: `Time to take ${medicationName} (${dosage})`,
    scheduledFor: reminderTime,
    isRecurring,
    recurrencePattern: 'daily',
    metadata: {
      medication_name: medicationName,
      dosage,
      reminder_id: reminderId,
    },
  });
}

// Schedule daily wellness check-in
export async function scheduleDailyWellnessCheckIn(
  userId: string,
  preferredTime: string = '09:00' // HH:MM format
) {
  // Calculate next occurrence based on preferred time
  const now = new Date();
  const [hours, minutes] = preferredTime.split(':').map(Number);

  const scheduledTime = new Date(now);
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  return scheduleNotification({
    userId,
    notificationType: 'wellness',
    title: 'Daily Wellness Check-In',
    body: 'How are you feeling today? Take a moment to check in.',
    scheduledFor: scheduledTime,
    isRecurring: true,
    recurrencePattern: 'daily',
    metadata: {
      preferred_time: preferredTime,
    },
  });
}

// Cancel scheduled notification
export async function cancelScheduledNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ is_cancelled: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in cancelScheduledNotification:', error);
    throw error;
  }
}

// Get user's scheduled notifications
export async function getUserScheduledNotifications(
  userId: string,
  includeCompleted: boolean = false
) {
  try {
    let query = supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_cancelled', false)
      .order('scheduled_for', { ascending: true });

    if (!includeCompleted) {
      query = query.is('sent_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching scheduled notifications:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserScheduledNotifications:', error);
    throw error;
  }
}

// Send immediate emergency alert to family members
export async function sendEmergencyAlert(
  residentId: string,
  incidentType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  detectedKeywords: string[] = [],
  additionalData: any = {}
) {
  try {
    // Get family members (NOK) for this resident
    const { data: relationships } = await supabase
      .from('elder_nok_relationships')
      .select('nok_id, users!elder_nok_relationships_nok_id_fkey(id, name, phone)')
      .eq('elder_id', residentId);

    if (!relationships || relationships.length === 0) {
      console.log('No family members found for resident:', residentId);
      return { sent: 0 };
    }

    // Get resident name
    const { data: resident } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', residentId)
      .single();

    const residentName = resident?.name || 'Resident';
    const residentPhone = resident?.phone;

    // Send notification to each family member
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let sentCount = 0;

    for (const relationship of relationships) {
      try {
        const familyMember = relationship.users as any;

        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: relationship.nok_id,
            title: '🚨 EMERGENCY ALERT',
            body: `${residentName} - ${incidentType} (${severity.toUpperCase()})`,
            notificationType: 'emergency',
            icon: '/icon-alert.png',
            badge: '/icon-alert.png',
            tag: 'emergency-alert',
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500], // Emergency pattern
            actions: residentPhone
              ? [
                  {
                    action: 'call_now',
                    title: 'Call Now',
                    icon: '/icon-phone.png',
                  },
                  {
                    action: 'view_details',
                    title: 'View Details',
                    icon: '/icon-info.png',
                  },
                ]
              : [
                  {
                    action: 'view_details',
                    title: 'View Details',
                    icon: '/icon-info.png',
                  },
                ],
            data: {
              residentId,
              residentName,
              phoneNumber: residentPhone,
              incidentType,
              severity,
              detectedKeywords,
              ...additionalData,
              url: '/nok-dashboard/escalation',
            },
          }),
        });

        if (response.ok) {
          sentCount++;
        }
      } catch (error) {
        console.error('Error sending notification to family member:', error);
      }
    }

    return { sent: sentCount, total: relationships.length };
  } catch (error) {
    console.error('Error in sendEmergencyAlert:', error);
    throw error;
  }
}

// Send incident alert to organization staff
export async function sendIncidentAlertToOrganization(
  organizationId: string,
  residentId: string,
  incidentType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  detectedKeywords: string[] = []
) {
  try {
    // Get organization staff members
    const { data: staffMembers } = await supabase
      .from('organization_staff')
      .select('user_id, users!organization_staff_user_id_fkey(id, name)')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (!staffMembers || staffMembers.length === 0) {
      console.log('No staff members found for organization:', organizationId);
      return { sent: 0 };
    }

    // Get resident name
    const { data: resident } = await supabase
      .from('users')
      .select('name')
      .eq('id', residentId)
      .single();

    const residentName = resident?.name || 'Resident';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let sentCount = 0;

    for (const staffMember of staffMembers) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: staffMember.user_id,
            title: severity === 'critical' ? '🚨 CRITICAL INCIDENT' : '⚠️ Incident Alert',
            body: `${residentName} - ${incidentType}`,
            notificationType: 'incident',
            requireInteraction: severity === 'critical',
            vibrate: severity === 'critical' ? [500, 200, 500, 200, 500] : [200, 100, 200],
            data: {
              organizationId,
              residentId,
              residentName,
              incidentType,
              severity,
              detectedKeywords,
              url: '/organization/incidents',
            },
          }),
        });

        if (response.ok) {
          sentCount++;
        }
      } catch (error) {
        console.error('Error sending notification to staff member:', error);
      }
    }

    return { sent: sentCount, total: staffMembers.length };
  } catch (error) {
    console.error('Error in sendIncidentAlertToOrganization:', error);
    throw error;
  }
}

// Schedule smart wellness reminder based on user's typical check-in patterns
export async function scheduleSmartWellnessReminder(userId: string) {
  try {
    // Get user's wellness check-in history to determine optimal time
    const { data: history } = await supabase
      .from('wellness_check_ins')
      .select('check_in_time')
      .eq('elder_id', userId)
      .order('created_at', { ascending: false })
      .limit(14); // Last 2 weeks

    let optimalTime = '09:00'; // Default

    if (history && history.length > 0) {
      // Calculate average check-in time
      const times = history
        .map((h) => {
          const [hours, minutes] = h.check_in_time.split(':').map(Number);
          return hours * 60 + minutes;
        })
        .filter((t) => !isNaN(t));

      if (times.length > 0) {
        const avgMinutes = Math.floor(times.reduce((a, b) => a + b, 0) / times.length);
        const hours = Math.floor(avgMinutes / 60);
        const minutes = avgMinutes % 60;
        optimalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }

    return scheduleDailyWellnessCheckIn(userId, optimalTime);
  } catch (error) {
    console.error('Error in scheduleSmartWellnessReminder:', error);
    throw error;
  }
}
