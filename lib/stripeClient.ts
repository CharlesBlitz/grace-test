import { supabase } from './supabaseClient';

export interface CheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: 'payment' | 'subscription';
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResponse> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('You must be logged in to upgrade your plan');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_id: params.priceId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      mode: params.mode || 'subscription',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return await response.json();
}

export async function redirectToCheckout(params: CheckoutSessionParams): Promise<void> {
  try {
    const { url } = await createCheckoutSession(params);
    window.location.href = url;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}

export async function createUpgradeCheckoutSession(
  planSlug: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Promise<void> {
  const { getPriceId } = await import('./stripeConfig');

  const priceId = getPriceId('individual', planSlug, billingCycle === 'yearly');

  if (!priceId) {
    throw new Error(`No price ID found for plan: ${planSlug}`);
  }

  const origin = window.location.origin;

  await redirectToCheckout({
    priceId,
    successUrl: `${origin}/settings/subscription?success=true&plan=${planSlug}`,
    cancelUrl: `${origin}/settings/subscription?cancelled=true`,
    mode: 'subscription',
  });
}

export async function createOrganizationCheckoutSession(
  planSlug: string
): Promise<void> {
  const { getPriceId } = await import('./stripeConfig');

  const priceId = getPriceId('organization', planSlug);

  if (!priceId) {
    throw new Error(`No price ID found for organization plan: ${planSlug}`);
  }

  const origin = window.location.origin;

  await redirectToCheckout({
    priceId,
    successUrl: `${origin}/organization/dashboard?success=true&plan=${planSlug}`,
    cancelUrl: `${origin}/organization/dashboard?cancelled=true`,
    mode: 'subscription',
  });
}

export async function createGraceNotesCheckoutSession(
  planSlug: string
): Promise<void> {
  const { getPriceId } = await import('./stripeConfig');

  const priceId = getPriceId('grace_notes', planSlug);

  if (!priceId) {
    throw new Error(`No price ID found for Grace Notes plan: ${planSlug}`);
  }

  const origin = window.location.origin;

  await redirectToCheckout({
    priceId,
    successUrl: `${origin}/grace-notes/dashboard?success=true&plan=${planSlug}`,
    cancelUrl: `${origin}/grace-notes/dashboard?cancelled=true`,
    mode: 'subscription',
  });
}
