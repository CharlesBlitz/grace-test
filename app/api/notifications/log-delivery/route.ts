import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, delivered, dismissed, opened, timestamp } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (delivered) {
      updateData.delivered_at = timestamp || new Date().toISOString();
    }

    if (dismissed) {
      updateData.dismissed_at = timestamp || new Date().toISOString();
    }

    if (opened) {
      updateData.opened_at = timestamp || new Date().toISOString();
    }

    const { error } = await supabase
      .from('notification_log')
      .update(updateData)
      .eq('id', notificationId);

    if (error) {
      console.error('Error updating notification log:', error);
      return NextResponse.json(
        { error: 'Failed to update notification log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in log-delivery route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
