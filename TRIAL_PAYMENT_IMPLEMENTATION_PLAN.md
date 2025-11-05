# Trial & Payment Flow Implementation Plan

## Executive Summary

This document provides a comprehensive plan for implementing a complete trial-to-paid subscription system for Grace Companion. The system handles three subscription types:

1. **Individual/Family Plans** - Free tier with paid upgrades
2. **Organization Plans** - 30-day free trial then paid
3. **Grace Notes (Practitioner) Plans** - 14-day free trial then paid

## Current State Analysis

### ✅ What's Already Built

1. **Database Schema** (Complete)
   - `subscription_plans` - Plan definitions with pricing
   - `user_subscriptions` - User subscription records
   - `subscription_features` - Feature catalog
   - `plan_features` - Plan-to-feature mapping
   - `subscription_usage` - Usage tracking

2. **Stripe Integration** (Partially Complete)
   - Stripe checkout edge function exists
   - Stripe webhook handler exists
   - Stripe price IDs configured in `stripeConfig.ts`
   - Environment variables configured

3. **Frontend Pages** (Complete)
   - Pricing page with all plans
   - Subscription settings page
   - Feature gate components
   - Organization registration with trial setup

4. **Service Layer** (Complete)
   - `subscriptionService.ts` with all helper functions
   - Feature checking functions
   - Usage tracking functions

### ❌ What's Missing

1. **Trial Expiration System**
   - No automated monitoring of trial expiration dates
   - No email notifications before/after trial ends
   - No automatic status changes when trials expire

2. **Payment Integration in Signup Flows**
   - Individual/family signup doesn't trigger subscription creation
   - Grace Notes signup doesn't set up trial tracking
   - No credit card collection for trials

3. **Usage Enforcement**
   - Usage tracking exists but not enforced at API endpoints
   - Voice conversation endpoints don't check limits
   - Reminder creation doesn't check quotas
   - Voice cloning doesn't check limits

4. **Subscription Management UI**
   - No upgrade/downgrade flows
   - No payment method management
   - No billing history
   - No invoice downloads

5. **Grace Notes Trial System**
   - Trial mentioned on pricing page but not implemented
   - No database tracking for Grace Notes trials

## Implementation Roadmap

### Phase 1: Trial Expiration System (Week 1)

#### 1.1 Database Enhancements

**Migration**: `add_trial_expiration_tracking.sql`

```sql
-- Add trial notification tracking to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS trial_warning_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_expired_notification_sent_at timestamptz;

-- Create trial expiration view for easy monitoring
CREATE OR REPLACE VIEW expiring_trials AS
SELECT
  us.id,
  us.user_id,
  us.organization_id,
  us.trial_ends_at,
  u.email as user_email,
  u.name as user_name,
  o.email as org_email,
  o.name as org_name,
  sp.name as plan_name,
  EXTRACT(DAYS FROM (us.trial_ends_at - now())) as days_remaining
FROM user_subscriptions us
LEFT JOIN users u ON us.user_id = u.id
LEFT JOIN organizations o ON us.organization_id = o.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'trial'
AND us.trial_ends_at IS NOT NULL
AND us.trial_ends_at > now()
ORDER BY us.trial_ends_at;
```

#### 1.2 Edge Function: Trial Monitor

**Function**: `trial-expiration-monitor`

```typescript
// Runs daily via cron to check for expiring/expired trials
// Sends notifications at: 7 days, 3 days, 1 day before, and on expiration

interface TrialNotification {
  id: string;
  user_email: string | null;
  org_email: string | null;
  user_name: string | null;
  org_name: string | null;
  plan_name: string;
  days_remaining: number;
}

async function processExpiringTrials() {
  // Get trials expiring in 7, 3, or 1 days
  const { data: expiringTrials } = await supabase
    .from('user_subscriptions')
    .select(`
      id,
      trial_ends_at,
      trial_warning_sent_at,
      user:users(email, name),
      organization:organizations(email, name),
      plan:subscription_plans(name)
    `)
    .eq('status', 'trial')
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', 'now()')
    .is('trial_warning_sent_at', null);

  for (const trial of expiringTrials) {
    const daysRemaining = getDaysRemaining(trial.trial_ends_at);

    if ([7, 3, 1].includes(daysRemaining)) {
      await sendTrialExpirationWarning(trial, daysRemaining);

      // Mark warning as sent
      await supabase
        .from('user_subscriptions')
        .update({ trial_warning_sent_at: new Date().toISOString() })
        .eq('id', trial.id);
    }
  }
}

async function processExpiredTrials() {
  // Get trials that have expired
  const { data: expiredTrials } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('status', 'trial')
    .lt('trial_ends_at', 'now()');

  for (const trial of expiredTrials) {
    // Update status to expired
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        trial_expired_notification_sent_at: new Date().toISOString()
      })
      .eq('id', trial.id);

    // Send expiration notification
    await sendTrialExpiredNotification(trial);

    // For organizations, mark as inactive if no payment
    if (trial.organization_id && !trial.stripe_subscription_id) {
      await supabase
        .from('organizations')
        .update({ is_active: false })
        .eq('id', trial.organization_id);
    }
  }
}
```

**Cron Schedule**: Daily at 9:00 AM
```bash
# In Supabase dashboard: Database -> Cron Jobs
SELECT cron.schedule('trial-expiration-check', '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://[your-project].supabase.co/functions/v1/trial-expiration-monitor',
    headers:='{"Authorization": "Bearer [service-role-key]"}'::jsonb
  );$$
);
```

#### 1.3 Email Templates

Create email templates for:
- 7-day warning
- 3-day warning
- 1-day warning
- Trial expired
- Payment required

**Location**: `lib/emailTemplates/trialNotifications.ts`

### Phase 2: Signup Flow Integration (Week 2)

#### 2.1 Individual/Family Signup Enhancement

**File**: `app/signup/page.tsx` or new flow

```typescript
async function completeSignup(userData: SignupData) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  });

  if (authError) throw authError;

  // 2. Create user record
  await supabase.from('users').insert({
    id: authData.user.id,
    email: userData.email,
    name: userData.name,
  });

  // 3. Auto-assign free plan
  const { data: freePlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('slug', 'free')
    .single();

  await supabase.from('user_subscriptions').insert({
    user_id: authData.user.id,
    plan_id: freePlan.id,
    status: 'active',
    billing_cycle: 'monthly',
  });

  // 4. Initialize usage tracking
  await initializeUsageTracking(authData.user.id);
}
```

#### 2.2 Organization Signup Enhancement

**File**: `app/organization/register/page.tsx` (Already has trial setup)

Current implementation already creates:
- Organization with `trial_ends_at = now() + 30 days`
- Admin user
- Organization user link

**Enhancement Needed**: Link to subscription system

```typescript
// After creating organization
const { data: trialPlan } = await supabase
  .from('subscription_plans')
  .select('id')
  .eq('slug', 'trial')
  .eq('plan_type', 'organization')
  .single();

await supabase.from('user_subscriptions').insert({
  organization_id: orgData.id,
  plan_id: trialPlan.id,
  status: 'trial',
  trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});
```

#### 2.3 Grace Notes Signup Enhancement

**File**: `app/grace-notes/register/page.tsx`

Add trial tracking:

```typescript
async function completeGraceNotesSignup(userData: SignupData, planSlug: string) {
  // 1. Create practitioner account
  const { data: authData } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  });

  // 2. Get selected plan
  const { data: plan } = await supabase
    .from('grace_notes_subscription_plans')
    .select('id, trial_days')
    .eq('slug', planSlug)
    .single();

  // 3. Create subscription with trial
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + (plan.trial_days || 14));

  await supabase.from('grace_notes_subscriptions').insert({
    practitioner_id: authData.user.id,
    plan_id: plan.id,
    status: 'trial',
    trial_ends_at: trialEndDate.toISOString(),
  });

  // 4. Redirect to dashboard with onboarding
  router.push('/grace-notes/dashboard?welcome=true');
}
```

### Phase 3: Payment Integration (Week 3)

#### 3.1 Upgrade Flow for Individual/Family

**Component**: `components/UpgradeModal.tsx`

```typescript
async function handleUpgrade(planSlug: string, billingCycle: 'monthly' | 'yearly') {
  // 1. Get Stripe price ID
  const priceId = getPriceId('individual', planSlug, billingCycle === 'yearly');

  // 2. Create checkout session
  const response = await fetch(
    `${supabaseUrl}/functions/v1/stripe-checkout`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: priceId,
        mode: 'subscription',
        success_url: `${window.location.origin}/settings/subscription?success=true`,
        cancel_url: `${window.location.origin}/settings/subscription?cancelled=true`,
      }),
    }
  );

  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe Checkout
}
```

#### 3.2 Enhanced Webhook Handler

**File**: `supabase/functions/stripe-webhook/index.ts`

Update to sync with `user_subscriptions` table:

```typescript
async function syncCustomerFromStripe(customerId: string) {
  // ... existing code ...

  // After syncing to stripe_subscriptions, also update user_subscriptions
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .single();

  if (customer?.user_id) {
    // Get the Stripe subscription details
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];

      // Map Stripe price ID to our plan
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('id')
        .or(`price_id_monthly.eq.${sub.items.data[0].price.id},price_id_yearly.eq.${sub.items.data[0].price.id}`)
        .single();

      if (plan) {
        // Update or create user_subscriptions record
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: customer.user_id,
            plan_id: plan.id,
            status: sub.status === 'active' ? 'active' : sub.status,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            billing_cycle: sub.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          });
      }
    }
  }
}
```

#### 3.3 Trial-to-Paid Conversion Flow

**Component**: `components/TrialConversionPrompt.tsx`

```typescript
function TrialConversionPrompt({ trialEndsAt, organizationId }: Props) {
  const daysRemaining = getDaysRemaining(trialEndsAt);

  return (
    <Alert variant={daysRemaining <= 3 ? 'destructive' : 'warning'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Trial Ending Soon</AlertTitle>
      <AlertDescription>
        Your trial ends in {daysRemaining} days. Choose a plan to continue using Grace Companion.
      </AlertDescription>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => router.push('/pricing')}>
          View Plans
        </Button>
        <Button variant="outline" onClick={() => router.push('/settings/subscription')}>
          Manage Subscription
        </Button>
      </div>
    </Alert>
  );
}
```

### Phase 4: Usage Enforcement (Week 4)

#### 4.1 Middleware for Feature Access

**File**: `lib/featureAccessMiddleware.ts`

```typescript
export async function checkFeatureAccess(
  userId: string,
  featureKey: string,
  increment: boolean = false
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  // 1. Get subscription
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return { allowed: false, reason: 'No active subscription' };
  }

  // 2. Check if subscription is expired
  if (subscription.status === 'expired') {
    return { allowed: false, reason: 'Subscription expired' };
  }

  // 3. Check feature access
  const result = await canUseFeature(userId, subscription.id, featureKey);

  if (!result.allowed) {
    return result;
  }

  // 4. Track usage if increment requested
  if (increment) {
    await trackFeatureUsage(subscription.id, featureKey);
  }

  // 5. Calculate remaining usage
  const limit = await getFeatureLimit(userId, featureKey);
  if (limit !== -1) {
    const currentUsage = await getCurrentUsage(subscription.id, featureKey);
    return { allowed: true, remaining: limit - currentUsage };
  }

  return { allowed: true };
}
```

#### 4.2 Apply to Voice Conversation Endpoint

**File**: `app/api/conv/respond/route.ts`

```typescript
export async function POST(request: Request) {
  const session = await getSession();

  // Check feature access before processing
  const access = await checkFeatureAccess(
    session.user.id,
    'voice_conversations',
    true // increment usage
  );

  if (!access.allowed) {
    return Response.json(
      { error: access.reason, upgrade_required: true },
      { status: 403 }
    );
  }

  // Continue with conversation processing...
  // Show remaining quota in response
  return Response.json({
    response: aiResponse,
    remaining_conversations: access.remaining,
  });
}
```

#### 4.3 Apply to Reminder Creation

**File**: `app/reminders/page.tsx` or API endpoint

```typescript
async function createReminder(reminderData: ReminderData) {
  // Check quota
  const access = await checkFeatureAccess(
    userId,
    'reminders',
    true
  );

  if (!access.allowed) {
    toast({
      title: 'Limit Reached',
      description: access.reason + '. Please upgrade your plan.',
      variant: 'destructive',
    });
    return;
  }

  // Create reminder
  await supabase.from('reminders').insert(reminderData);

  toast({
    title: 'Reminder Created',
    description: access.remaining
      ? `${access.remaining} reminders remaining this month`
      : 'Unlimited reminders',
  });
}
```

#### 4.4 Apply to Voice Cloning

**File**: Voice cloning component/endpoint

```typescript
async function startVoiceClone() {
  // Check both access and count limit
  const access = await checkFeatureAccess(userId, 'voice_cloning');

  if (!access.allowed) {
    // Show upgrade prompt
    return;
  }

  // Check current clone count
  const { data: existingClones } = await supabase
    .from('voice_clones')
    .select('id')
    .eq('user_id', userId);

  const limit = await getFeatureLimit(userId, 'voice_cloning_count');

  if (limit !== -1 && existingClones.length >= limit) {
    toast({
      title: 'Limit Reached',
      description: `Your plan allows ${limit} voice clone(s). Please upgrade for more.`,
    });
    return;
  }

  // Proceed with voice cloning...
}
```

### Phase 5: Subscription Management UI (Week 5)

#### 5.1 Enhanced Subscription Settings Page

**File**: `app/settings/subscription/page.tsx` (enhance existing)

Add sections for:

```typescript
// Payment method management
function PaymentMethodSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        {subscription.stripe_customer_id ? (
          <div>
            <p>Card ending in {paymentMethod.last4}</p>
            <Button onClick={updatePaymentMethod}>Update Card</Button>
          </div>
        ) : (
          <Button onClick={addPaymentMethod}>Add Payment Method</Button>
        )}
      </CardContent>
    </Card>
  );
}

// Billing history
function BillingHistorySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Invoice</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map(invoice => (
              <TableRow key={invoice.id}>
                <TableCell>{formatDate(invoice.date)}</TableCell>
                <TableCell>£{invoice.amount}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>
                  <Button variant="link" onClick={() => downloadInvoice(invoice.id)}>
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Plan change flow
function PlanChangeSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {availablePlans.map(plan => (
            <div key={plan.id} className="flex justify-between items-center">
              <div>
                <h4>{plan.name}</h4>
                <p>{plan.description}</p>
              </div>
              <div>
                <span className="font-bold">£{plan.price}/month</span>
                <Button
                  onClick={() => changePlan(plan.slug)}
                  disabled={plan.slug === currentPlan}
                >
                  {plan.slug === currentPlan ? 'Current Plan' : 'Switch'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 5.2 Cancellation Flow

```typescript
async function handleCancellation() {
  // Confirm dialog
  const confirmed = await confirmDialog({
    title: 'Cancel Subscription',
    description: 'Are you sure? You will retain access until the end of your billing period.',
  });

  if (!confirmed) return;

  // Call Stripe to cancel at period end
  const response = await fetch(
    `${supabaseUrl}/functions/v1/cancel-subscription`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription_id: subscription.stripe_subscription_id,
      }),
    }
  );

  if (response.ok) {
    toast({
      title: 'Subscription Cancelled',
      description: 'Access continues until ' + formatDate(subscription.current_period_end),
    });
  }
}
```

### Phase 6: Grace Notes Trial System (Week 6)

#### 6.1 Database Migration

**Migration**: `add_grace_notes_subscriptions.sql`

```sql
-- Create grace_notes_subscription_plans if not exists
CREATE TABLE IF NOT EXISTS grace_notes_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  price_monthly numeric(10,2) NOT NULL,
  max_clients integer,
  trial_days integer DEFAULT 14,
  features jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create grace_notes_subscriptions
CREATE TABLE IF NOT EXISTS grace_notes_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES grace_notes_subscription_plans(id),
  status text NOT NULL CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now()
);

-- Insert Grace Notes plans
INSERT INTO grace_notes_subscription_plans (name, slug, price_monthly, max_clients, trial_days) VALUES
  ('Solo', 'solo', 29, 20, 14),
  ('Small Team', 'small_team', 79, 100, 14),
  ('Practice', 'practice', 199, NULL, 14);

-- Enable RLS
ALTER TABLE grace_notes_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_notes_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view plans"
  ON grace_notes_subscription_plans FOR SELECT USING (true);

CREATE POLICY "Practitioners can view own subscription"
  ON grace_notes_subscriptions FOR SELECT
  TO authenticated
  USING (practitioner_id = auth.uid());
```

#### 6.2 Grace Notes Trial Monitor

Add Grace Notes subscriptions to the trial monitor function created in Phase 1.

### Phase 7: Testing & Quality Assurance (Week 7)

#### 7.1 Test Scenarios

**Individual/Family Flow**:
1. Sign up → Auto-assigned free plan
2. Use features up to limit → See limit reached message
3. Upgrade to Essential → Stripe checkout → Webhook processes → Access granted
4. Downgrade to Free → Confirm at period end

**Organization Flow**:
1. Register organization → Trial starts (30 days)
2. Receive 7-day warning email
3. Receive 3-day warning email
4. Receive 1-day warning email
5. Trial expires → Access restricted
6. Select plan → Payment → Access restored

**Grace Notes Flow**:
1. Register with plan selection → 14-day trial starts
2. Receive warning emails at 7, 3, 1 days
3. Trial expires → Access restricted
4. Add payment method → Access restored

#### 7.2 Edge Cases to Test

- User signs up during Stripe maintenance
- Webhook fails to process
- User cancels during trial
- User upgrades during trial
- Multiple rapid upgrades/downgrades
- Expired card during renewal
- Refund processing

## Database Schema Additions

### New Tables Needed

```sql
-- Store Stripe-related data for Grace Companion subscription system
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  customer_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text UNIQUE NOT NULL,
  subscription_id text,
  price_id text,
  status text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text UNIQUE NOT NULL,
  payment_intent_id text,
  customer_id text NOT NULL,
  amount_subtotal bigint,
  amount_total bigint,
  currency text,
  payment_status text,
  status text,
  created_at timestamptz DEFAULT now()
);

-- Add Stripe price IDs to subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text;

-- Update existing plans with Stripe price IDs
UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPTfiCVCzUYN9npcwpKQHVu',
  stripe_price_id_yearly = 'price_1SPTjGCVCzUYN9npc46iVNT6'
WHERE slug = 'essential';

UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPTkRCVCzUYN9npTsMjkWg3',
  stripe_price_id_yearly = 'price_1SPTlTCVCzUYN9npPV5Qgkpu'
WHERE slug = 'plus';

UPDATE subscription_plans SET
  stripe_price_id_monthly = 'price_1SPToTCVCzUYN9npkJnl99hT',
  stripe_price_id_yearly = 'price_1SPTqUCVCzUYN9npVPRiSchF'
WHERE slug = 'premium';
```

## Environment Variables

Ensure these are set (already configured in `.env`):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # ADD THIS
```

## Monitoring & Analytics

### Key Metrics to Track

1. **Trial Conversion Rate**
   - Percentage of trials that convert to paid
   - Track by plan type

2. **Churn Rate**
   - Monthly cancellations / active subscriptions
   - Identify patterns (e.g., high churn after 3 months)

3. **Average Revenue Per User (ARPU)**
   - Total MRR / active subscribers

4. **Trial Drop-off Points**
   - Where in the trial period do users stop engaging?

5. **Feature Usage by Plan**
   - Which features drive upgrades?

### Recommended Dashboard

Create an admin dashboard at `/admin/subscription-analytics` showing:
- Active subscriptions by plan
- MRR trend over time
- Trials in progress
- Trials expiring this week
- Recent upgrades/downgrades
- Failed payments requiring attention

## Email Templates Required

Create these email templates:

1. **Trial Started** - Welcome email with trial details
2. **7-Day Warning** - "Your trial expires in 7 days"
3. **3-Day Warning** - "Your trial expires in 3 days"
4. **1-Day Warning** - "Your trial expires tomorrow"
5. **Trial Expired** - "Your trial has ended"
6. **Payment Failed** - "We couldn't process your payment"
7. **Subscription Activated** - "Welcome to [Plan Name]!"
8. **Subscription Cancelled** - "Sorry to see you go"
9. **Subscription Renewed** - Monthly renewal confirmation

## Success Criteria

### Phase 1-3 Complete When:
- [ ] Trials automatically expire and status changes
- [ ] Email notifications sent at correct intervals
- [ ] Users can upgrade from free to paid via Stripe
- [ ] Organizations can convert from trial to paid
- [ ] Webhooks correctly update subscription status

### Phase 4-6 Complete When:
- [ ] Feature usage is enforced (limits block access)
- [ ] Upgrade prompts shown when limits reached
- [ ] Payment method can be updated
- [ ] Billing history is visible
- [ ] Grace Notes trials work end-to-end

### Production Ready When:
- [ ] All test scenarios pass
- [ ] Error handling covers edge cases
- [ ] Email deliverability confirmed
- [ ] Webhook signing verified
- [ ] RLS policies tested
- [ ] Performance benchmarks met
- [ ] Documentation complete

## Rollout Strategy

### Stage 1: Internal Testing (1 week)
- Test with team accounts
- Verify all flows work
- Fix critical bugs

### Stage 2: Beta Testing (2 weeks)
- Invite 10-20 organizations to test
- Collect feedback
- Monitor for issues

### Stage 3: Soft Launch (1 month)
- Enable for new signups only
- Keep existing users on old system
- Monitor conversion rates

### Stage 4: Full Launch
- Migrate existing users
- Full marketing push
- Monitor closely for first week

## Support & Troubleshooting

### Common Issues

**Issue**: Webhook not processing
**Solution**: Check Stripe dashboard for failed webhooks, verify signing secret

**Issue**: Trial not expiring
**Solution**: Check cron job is running, verify trial_ends_at dates

**Issue**: User upgraded but still sees limits
**Solution**: Check user_subscriptions status, verify webhook processed

**Issue**: Double charging
**Solution**: Check for duplicate Stripe customers, implement idempotency

### Support Playbook

Create support documentation for:
1. Manually extending a trial
2. Issuing refunds
3. Resetting usage counts
4. Troubleshooting failed payments
5. Cancelling subscriptions

## Estimated Timeline

- **Week 1**: Trial expiration system
- **Week 2**: Signup flow integration
- **Week 3**: Payment integration
- **Week 4**: Usage enforcement
- **Week 5**: Subscription management UI
- **Week 6**: Grace Notes trial system
- **Week 7**: Testing & QA
- **Week 8**: Beta testing
- **Week 9-10**: Refinement
- **Week 11**: Production launch

## Budget Considerations

### Stripe Fees
- 2.9% + £0.20 per transaction (UK cards)
- No monthly fees for subscription management

### Email Sending
- Use Supabase/Resend/SendGrid
- ~£0.80 per 1,000 emails
- Estimate 4 emails per trial = £0.0032 per trial

### Estimated Costs for 100 Users/Month
- Stripe fees (assuming 50% convert): £145
- Email costs: £0.32
- **Total**: ~£145/month

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on business needs
3. **Assign developers** to each phase
4. **Set up project board** for tracking
5. **Begin Phase 1** implementation

## Questions to Answer Before Starting

1. Should we require credit card for Grace Notes trials?
2. What happens to organization data when trial expires?
3. Do we want proration for mid-cycle upgrades?
4. Should free users be auto-upgraded to Essential after X time?
5. What's the refund policy?
6. Do we offer annual discounts for organizations?

---

**Document Version**: 1.0
**Last Updated**: November 4, 2025
**Author**: Claude Code
**Status**: Ready for Review
