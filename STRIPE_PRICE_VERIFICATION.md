# Stripe Price ID Verification Checklist

This document lists all Stripe Price IDs configured in your application. You need to verify these exist in your Stripe Dashboard.

## How to Verify

1. Go to https://dashboard.stripe.com/test/products
2. For each product, check that the price IDs match exactly
3. Update any mismatches in `lib/stripeConfig.ts`

## Individual Plans

| Plan | Monthly Price | Price ID | Yearly Price | Price ID |
|------|---------------|----------|--------------|----------|
| Free | £0 | N/A | £0 | N/A |
| Essential | £9.99 | `price_1SPTfiCVCzUYN9npcwpKQHVu` | £99 | `price_1SPYtVCVCzUYN9npQW1RZQFl` |
| Plus | £19.99 | `price_1SPTkRCVCzUYN9npTsMjkWg3` | £199 | `price_1SPYurCVCzUYN9nphKWMtJFa` |
| Premium | £34.99 | `price_1SPToTCVCzUYN9npkJnl99hT` | £349 | `price_1SPYs5CVCzUYN9npPJdnuhrK` |

### Steps to Verify Individual Plans:
- [x] Verify Essential monthly price (£9.99) exists with ID `price_1SPTfiCVCzUYN9npcwpKQHVu`
- [x] Verify Essential yearly price (£99) exists with ID `price_1SPYtVCVCzUYN9npQW1RZQFl`
- [x] Verify Plus monthly price (£19.99) exists with ID `price_1SPTkRCVCzUYN9npTsMjkWg3`
- [x] Verify Plus yearly price (£199) exists with ID `price_1SPYurCVCzUYN9nphKWMtJFa`
- [x] Verify Premium monthly price (£34.99) exists with ID `price_1SPToTCVCzUYN9npkJnl99hT`
- [x] Verify Premium yearly price (£349) exists with ID `price_1SPYs5CVCzUYN9npPJdnuhrK`

## Organization Plans

| Plan | Monthly Price | Price ID |
|------|---------------|----------|
| Trial | £0 | N/A |
| Basic | £159 | `price_1SPTqUCVCzUYN9npVPRiSchF` |
| Professional | £399 | `price_1SPTrWCVCzUYN9np69KsVYUK` |

### Steps to Verify Organization Plans:
- [x] Verify Basic monthly price (£159) exists with ID `price_1SPTqUCVCzUYN9npVPRiSchF`
- [x] Verify Professional monthly price (£399) exists with ID `price_1SPTrWCVCzUYN9np69KsVYUK`

## Grace Notes Plans (for practitioners)

| Plan | Monthly Price | Price ID |
|------|---------------|----------|
| Solo | £29 | `price_1SPTsWCVCzUYN9np9UdMdgnx` |
| Small Team | £79 | `price_1SPTtGCVCzUYN9npscLFzIJ6` |
| Practice | £199 | `price_1SPTuMCVCzUYN9npVFAVSDkq` |

### Steps to Verify Grace Notes Plans:
- [x] Verify Solo monthly price (£29) exists with ID `price_1SPTsWCVCzUYN9np9UdMdgnx`
- [x] Verify Small Team monthly price (£79) exists with ID `price_1SPTtGCVCzUYN9npscLFzIJ6`
- [x] Verify Practice monthly price (£199) exists with ID `price_1SPTuMCVCzUYN9npVFAVSDkq`

## What to Do If Price IDs Don't Match

If any price IDs in Stripe don't match the ones listed above:

1. **Option A (Recommended)**: Update `lib/stripeConfig.ts` with the correct price IDs from Stripe
2. **Option B**: Create new prices in Stripe matching the amounts above and use these new price IDs

## Important Notes

- All prices should be in **Test Mode** for development
- Make sure to create corresponding **Live Mode** prices when going to production
- The webhook secret in `.env` must match your Stripe webhook endpoint
- Webhook endpoint URL should be: `https://zermpccupnalzeotsxzy.supabase.co/functions/v1/stripe-webhook`

## Testing Checklist

After verification, test the complete payment flow:

- [ ] Test Essential monthly subscription checkout
- [ ] Test Essential yearly subscription checkout (verify 17% savings)
- [ ] Test Plus monthly subscription checkout
- [ ] Test Premium yearly subscription checkout
- [ ] Test organization Basic plan checkout
- [ ] Test organization Professional plan checkout
- [ ] Verify webhook receives events successfully
- [ ] Verify user_subscriptions table updates correctly after payment
- [ ] Test subscription cancellation flow
- [ ] Test subscription upgrade/downgrade

## Stripe Dashboard Quick Links

- Products: https://dashboard.stripe.com/test/products
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Customers: https://dashboard.stripe.com/test/customers
- Subscriptions: https://dashboard.stripe.com/test/subscriptions
