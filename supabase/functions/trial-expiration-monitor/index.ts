import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    console.info('[Trial Monitor] Starting trial expiration check...');

    await processExpiringTrials();
    await processExpiredTrials();

    console.info('[Trial Monitor] Completed trial expiration check');

    return new Response(
      JSON.stringify({ success: true, message: 'Trial monitoring completed' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[Trial Monitor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

async function processExpiringTrials() {
  const now = new Date();

  const { data: expiringTrials, error } = await supabase
    .from('user_subscriptions')
    .select(`
      id,
      trial_ends_at,
      trial_warning_sent_at,
      user_id,
      organization_id,
      users!inner(id, email, name),
      organizations(id, email, name)
    `)
    .eq('status', 'trial')
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', now.toISOString())
    .is('trial_warning_sent_at', null);

  if (error) {
    console.error('[Trial Monitor] Error fetching expiring trials:', error);
    return;
  }

  console.info(`[Trial Monitor] Found ${expiringTrials?.length || 0} trials to check`);

  for (const trial of expiringTrials || []) {
    const trialEndsAt = new Date(trial.trial_ends_at!);
    const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if ([7, 3, 1].includes(daysRemaining)) {
      console.info(`[Trial Monitor] Sending ${daysRemaining}-day warning for subscription ${trial.id}`);

      const email = trial.user_id ? trial.users?.email : trial.organizations?.email;
      const name = trial.user_id ? trial.users?.name : trial.organizations?.name;

      if (email) {
        await sendTrialWarningEmail(email, name || 'User', daysRemaining, trial.user_id ? 'individual' : 'organization');

        await supabase
          .from('user_subscriptions')
          .update({ trial_warning_sent_at: now.toISOString() })
          .eq('id', trial.id);
      }
    }
  }
}

async function processExpiredTrials() {
  const now = new Date();

  const { data: expiredTrials, error } = await supabase
    .from('user_subscriptions')
    .select(`
      id,
      trial_ends_at,
      trial_expired_notification_sent_at,
      user_id,
      organization_id,
      users!inner(id, email, name),
      organizations(id, email, name)
    `)
    .eq('status', 'trial')
    .not('trial_ends_at', 'is', null)
    .lt('trial_ends_at', now.toISOString());

  if (error) {
    console.error('[Trial Monitor] Error fetching expired trials:', error);
    return;
  }

  console.info(`[Trial Monitor] Found ${expiredTrials?.length || 0} expired trials to process`);

  for (const trial of expiredTrials || []) {
    console.info(`[Trial Monitor] Expiring trial for subscription ${trial.id}`);

    await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        trial_expired_notification_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', trial.id);

    const email = trial.user_id ? trial.users?.email : trial.organizations?.email;
    const name = trial.user_id ? trial.users?.name : trial.organizations?.name;

    if (email) {
      await sendTrialExpiredEmail(email, name || 'User', trial.user_id ? 'individual' : 'organization');
    }

    if (trial.organization_id) {
      await supabase
        .from('organizations')
        .update({ is_active: false })
        .eq('id', trial.organization_id);

      console.info(`[Trial Monitor] Deactivated organization ${trial.organization_id}`);
    }
  }
}

async function sendTrialWarningEmail(
  email: string,
  name: string,
  daysRemaining: number,
  accountType: 'individual' | 'organization'
) {
  console.info(`[Trial Monitor] Sending ${daysRemaining}-day warning to ${email}`);

  const subject = `Your Grace Companion trial expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

  const message = accountType === 'individual'
    ? `Hi ${name},

Your Grace Companion trial will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.

To continue enjoying unlimited conversations, reminders, and all our features, please choose a plan that works for you:

• Essential: £9.99/month - Unlimited conversations and basic features
• Plus: £19.99/month - Advanced monitoring and escalation alerts
• Premium: £34.99/month - Complete care coordination with AI insights

Visit ${Deno.env.get('SITE_URL') || 'https://gracecompanion.com'}/pricing to upgrade.

Thank you for trying Grace Companion!

The Grace Companion Team`
    : `Hi ${name},

Your Grace Companion organization trial will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.

To continue providing quality care with our platform, please select a plan:

• Basic: £159/month - Up to 50 residents
• Professional: £399/month - Up to 150 residents with advanced features
• Enterprise: Custom pricing - Unlimited residents with dedicated support

Visit ${Deno.env.get('SITE_URL') || 'https://gracecompanion.com'}/organization to upgrade.

Need help choosing? Contact our team for personalized recommendations.

The Grace Companion Team`;

  console.info(`[Trial Monitor] Email content prepared for ${email}`);
}

async function sendTrialExpiredEmail(
  email: string,
  name: string,
  accountType: 'individual' | 'organization'
) {
  console.info(`[Trial Monitor] Sending expiration notification to ${email}`);

  const subject = 'Your Grace Companion trial has expired';

  const message = accountType === 'individual'
    ? `Hi ${name},

Your Grace Companion trial has expired. We hope you enjoyed experiencing our features!

Your account is currently inactive. To restore access and continue using Grace Companion, please choose a plan:

Visit ${Deno.env.get('SITE_URL') || 'https://gracecompanion.com'}/pricing to reactivate your account.

All your data is safely stored and will be available once you upgrade.

Questions? Reply to this email or visit our support page.

The Grace Companion Team`
    : `Hi ${name},

Your Grace Companion organization trial has expired.

Your organization account is now inactive. To restore access for your staff and residents, please select a plan:

Visit ${Deno.env.get('SITE_URL') || 'https://gracecompanion.com'}/organization to reactivate.

All your resident data and care plans are safely stored and will be immediately available upon upgrade.

Need assistance? Contact our team at support@gracecompanion.com

The Grace Companion Team`;

  console.info(`[Trial Monitor] Expiration email prepared for ${email}`);
}
