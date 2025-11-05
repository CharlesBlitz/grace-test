/**
 * Stripe Price ID Configuration
 *
 * Maps internal plan slugs to Stripe price IDs.
 * Update these price IDs with your actual Stripe price IDs.
 */

// Individual Plans
export const INDIVIDUAL_PRICE_IDS = {
  free: null, // Free tier doesn't need a price ID
  essential: 'price_1SPTfiCVCzUYN9npcwpKQHVu', // £9.99/month
  essentialYearly: 'price_1SPYtVCVCzUYN9npQW1RZQFl', // £99/year
  plus: 'price_1SPTkRCVCzUYN9npTsMjkWg3', // £19.99/month
  plusYearly: 'price_1SPYurCVCzUYN9nphKWMtJFa', // £199/year
  premium: 'price_1SPToTCVCzUYN9npkJnl99hT', // £34.99/month
  premiumYearly: 'price_1SPYs5CVCzUYN9npPJdnuhrK', // £349/year
} as const;

// Organization Plans
export const ORGANIZATION_PRICE_IDS = {
  trial: null, // Trial doesn't need a price ID
  basic: 'price_1SPTqUCVCzUYN9npVPRiSchF', // £159/month
  professional: 'price_1SPTrWCVCzUYN9np69KsVYUK', // £399/month
} as const;

// Grace Notes Plans (for practitioners)
export const GRACE_NOTES_PRICE_IDS = {
  solo: 'price_1SPTsWCVCzUYN9np9UdMdgnx', // £29/month
  small_team: 'price_1SPTtGCVCzUYN9npscLFzIJ6', // £79/month
  practice: 'price_1SPTuMCVCzUYN9npVFAVSDkq', // £199/month
} as const;

/**
 * Get Stripe price ID for a given plan
 */
export function getPriceId(
  planType: 'individual' | 'organization' | 'grace_notes',
  planSlug: string,
  isYearly = false
): string | null {
  if (planType === 'individual') {
    const key = isYearly && planSlug !== 'free' ? `${planSlug}Yearly` as keyof typeof INDIVIDUAL_PRICE_IDS : planSlug as keyof typeof INDIVIDUAL_PRICE_IDS;
    return INDIVIDUAL_PRICE_IDS[key] || null;
  } else if (planType === 'organization') {
    return ORGANIZATION_PRICE_IDS[planSlug as keyof typeof ORGANIZATION_PRICE_IDS] || null;
  } else if (planType === 'grace_notes') {
    return GRACE_NOTES_PRICE_IDS[planSlug as keyof typeof GRACE_NOTES_PRICE_IDS] || null;
  }
  return null;
}
