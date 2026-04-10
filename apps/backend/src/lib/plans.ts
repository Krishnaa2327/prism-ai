// Single source of truth for plan limits and Stripe price IDs.
// When you create products in Stripe dashboard, paste the price IDs here.

export interface Plan {
  name: string;
  monthlyMessageLimit: number;
  priceId: string | null;   // null = free (no Stripe price)
  price: number;            // USD per month, for display only
}

export const PLANS: Record<string, Plan> = {
  free: {
    name: 'Free',
    monthlyMessageLimit: 100,
    priceId: null,
    price: 0,
  },
  starter: {
    name: 'Starter',
    monthlyMessageLimit: 1_000,
    priceId: process.env.STRIPE_PRICE_STARTER ?? 'price_starter_placeholder',
    price: 99,
  },
  growth: {
    name: 'Growth',
    monthlyMessageLimit: 10_000,
    priceId: process.env.STRIPE_PRICE_GROWTH ?? 'price_growth_placeholder',
    price: 299,
  },
  scale: {
    name: 'Scale',
    monthlyMessageLimit: 999_999,   // effectively unlimited
    priceId: process.env.STRIPE_PRICE_SCALE ?? 'price_scale_placeholder',
    price: 999,
  },
};

// Map a Stripe price ID back to a plan key
export function planFromPriceId(priceId: string): string {
  const entry = Object.entries(PLANS).find(([, p]) => p.priceId === priceId);
  return entry?.[0] ?? 'free';
}
