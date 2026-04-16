// Single source of truth for plan limits and Stripe price IDs.
// When you create products in Stripe dashboard, paste the price IDs here.

export interface Plan {
  name: string;
  monthlyMessageLimit: number;
  agentLimit: number;       // max OnboardingFlows; 0 = unlimited
  mtuLimit: number;         // max Monthly Tracked Users; 0 = unlimited
  mcpConnectorLimit: number;// max MCP connectors; 0 = unlimited
  priceId: string | null;   // null = free (no Stripe price)
  price: number;            // USD per month, for display only
  features: string[];       // shown on billing page
}

export const PLANS: Record<string, Plan> = {
  free: {
    name: 'Free',
    monthlyMessageLimit: 1_000,
    agentLimit: 3,
    mtuLimit: 100,
    mcpConnectorLimit: 0,   // unlimited
    priceId: null,
    price: 0,
    features: [
      'Up to 3 AI agents',
      '100 Monthly Tracked Users',
      'White-label widget',
      'MCP connectors',
      'Knowledge base (documents)',
      'Basic analytics',
      'Community support',
    ],
  },
  starter: {
    name: 'Starter',
    monthlyMessageLimit: 5_000,
    agentLimit: 10,
    mtuLimit: 1_000,
    mcpConnectorLimit: 0,
    priceId: process.env.STRIPE_PRICE_STARTER ?? 'price_starter_placeholder',
    price: 99,
    features: [
      'Up to 10 AI agents',
      '1,000 Monthly Tracked Users',
      'White-label widget',
      'MCP connectors',
      'Knowledge base (documents)',
      'Advanced analytics',
      'Email support',
      'Failure inbox',
      'Agent health monitoring',
    ],
  },
  growth: {
    name: 'Growth',
    monthlyMessageLimit: 25_000,
    agentLimit: 0,
    mtuLimit: 10_000,
    mcpConnectorLimit: 0,
    priceId: process.env.STRIPE_PRICE_GROWTH ?? 'price_growth_placeholder',
    price: 299,
    features: [
      'Unlimited AI agents',
      '10,000 Monthly Tracked Users',
      'White-label widget',
      'MCP connectors',
      'Knowledge base (documents)',
      'Advanced analytics + ROI metrics',
      'Priority email support',
      'Audit log',
      'Guardrails + sensitive field masking',
    ],
  },
  scale: {
    name: 'Scale',
    monthlyMessageLimit: 999_999,
    agentLimit: 0,
    mtuLimit: 0,
    mcpConnectorLimit: 0,
    priceId: process.env.STRIPE_PRICE_SCALE ?? 'price_scale_placeholder',
    price: 999,
    features: [
      'Unlimited AI agents',
      'Unlimited Monthly Tracked Users',
      'White-label widget',
      'MCP connectors',
      'Knowledge base (documents)',
      'Advanced analytics + ROI metrics',
      'Dedicated Slack support',
      'Audit log',
      'Guardrails + sensitive field masking',
      'SSO / SAML',
      'SLA guarantee',
    ],
  },
};

// Map a Stripe price ID back to a plan key
export function planFromPriceId(priceId: string): string {
  const entry = Object.entries(PLANS).find(([, p]) => p.priceId === priceId);
  return entry?.[0] ?? 'free';
}
