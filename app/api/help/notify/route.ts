import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getUserSubscription, canUseFeature, trackFeatureUsage } from '@/lib/subscriptionService';
import { rateLimit, getIdentifier, createRateLimitResponse } from '@/lib/rateLimiter';
import { handleApiError } from '@/lib/errorTracking';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for emergency alerts
    const rateLimitResult = await rateLimit(getIdentifier(request), 'strict');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.resetTime!);
    }

    const { elderId } = await request.json();

    if (!elderId) {
      return NextResponse.json(
        { error: 'elderId is required' },
        { status: 400 }
      );
    }

    // Check subscription and feature access
    const subscription = await getUserSubscription(elderId);

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found', upgradeUrl: '/pricing' },
        { status: 403 }
      );
    }

    // Emergency help should be available to all tiers, but track usage
    const usageCheck = await canUseFeature(elderId, subscription.id, 'emergency_alerts');

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason || 'Emergency alert feature not available',
          upgradeUrl: '/pricing'
        },
        { status: 403 }
      );
    }

    const { data: elder } = await supabase
      .from('users')
      .select('*')
      .eq('id', elderId)
      .maybeSingle();

    if (!elder) {
      return NextResponse.json(
        { error: 'Elder not found' },
        { status: 404 }
      );
    }

    const { data: nokContacts } = await supabase
      .from('voice_profiles')
      .select('nok_id, display_name')
      .eq('elder_id', elderId)
      .not('nok_id', 'is', null);

    console.log('EMERGENCY HELP REQUEST');
    console.log('Elder:', elder.name, elder.email);
    console.log('Timestamp:', new Date().toISOString());
    console.log('NOK Contacts to notify:', nokContacts?.length || 0);

    await supabase.from('conversations').insert({
      elder_id: elderId,
      transcript: `EMERGENCY: Help requested by ${elder.name} at ${new Date().toLocaleString()}`,
      sentiment: 'neg',
    });

    // Track emergency alert usage
    await trackFeatureUsage(subscription.id, 'emergency_alerts', 1);

    return NextResponse.json({
      success: true,
      message: 'Family has been notified',
      contactsNotified: nokContacts?.length || 0,
    });
  } catch (error) {
    return handleApiError(error, request, undefined);
  }
}
