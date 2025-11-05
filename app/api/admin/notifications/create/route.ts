import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) {
      console.error('Error checking admin user:', adminError);
      return NextResponse.json(
        { error: 'Error verifying admin access' },
        { status: 500 }
      );
    }

    if (!adminUser) {
      console.error('Admin user not found for user ID:', user.id);
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      notification_type,
      priority,
      target_audience,
      scheduled_for,
      target_filters = {},
    } = body;

    if (!title || !message || !notification_type || !priority || !target_audience) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const isScheduled = !!scheduled_for;
    const status = isScheduled ? 'scheduled' : 'sent';

    const { data: notification, error: notificationError } = await supabase
      .from('admin_notifications')
      .insert({
        title,
        message,
        notification_type,
        priority,
        target_audience,
        target_filters,
        scheduled_for,
        created_by: adminUser.id,
        status,
        sent_at: isScheduled ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    let sent_count = 0;

    if (!isScheduled) {
      const targetUsers = await getTargetUsers(supabase, target_audience, target_filters);

      if (targetUsers.length > 0) {
        const recipients = targetUsers.map((userId) => ({
          notification_id: notification.id,
          user_id: userId,
        }));

        const { error: recipientsError } = await supabase
          .from('admin_notification_recipients')
          .insert(recipients);

        if (recipientsError) {
          console.error('Error creating recipients:', recipientsError);
        } else {
          sent_count = targetUsers.length;

          await supabase
            .from('admin_notifications')
            .update({ sent_count })
            .eq('id', notification.id);

          for (const userId of targetUsers) {
            try {
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  userId,
                  title,
                  body: message,
                  notificationType: 'conversation',
                  requireInteraction: priority === 'urgent',
                  data: {
                    notification_id: notification.id,
                    admin_notification: true,
                  },
                },
              });
            } catch (error) {
              console.error(`Error sending push notification to user ${userId}:`, error);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      notification,
      sent_count,
      scheduled: isScheduled,
    });
  } catch (error) {
    console.error('Error in create notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getTargetUsers(
  supabase: any,
  targetAudience: string,
  targetFilters: any
): Promise<string[]> {
  let query = supabase
    .from('users')
    .select('id');

  switch (targetAudience) {
    case 'grace_companion':
      query = query.eq('role', 'elder');
      break;
    case 'organizations':
      query = query.eq('role', 'organization');
      break;
    case 'grace_notes':
      query = query.eq('role', 'practitioner');
      break;
    case 'all':
      break;
    case 'custom':
      if (targetFilters.organization_id) {
        query = query.eq('organization_id', targetFilters.organization_id);
      }
      if (targetFilters.role) {
        query = query.eq('role', targetFilters.role);
      }
      break;
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching target users:', error);
    return [];
  }

  return data ? data.map((user: any) => user.id) : [];
}
