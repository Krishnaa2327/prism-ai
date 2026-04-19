// Single source of truth for plan limits and Stripe price IDs.
// When you create products in Stripe dashboard, paste the price IDs here.

export interface PlanFeatures {
  failureInbox: boolean;      // Starter+
  sessionReplay: boolean;     // Starter+
  agentHealth: boolean;       // Starter+
  emailEscalation: boolean;   // Starter+
  abExperiments: boolean;     // Growth+
  auditLog: boolean;          // Growth+
  guardrails: boolean;        // Growth+
  slackEscalation: boolean;   // Growth+
  customRetention: boolean;   // Scale only
  sso: boolean;               // Scale only
  multilingual: boolean;      // All plans
}

export interface Plan {
  name: string;
  monthlyMessageLimit: number;
  agentLimit: number;
  mtuLimit: number;
  mcpConnectorLimit: number;
  priceId: string | null;
  price: number;
  inrPrice: number;
  featureList: string[];
  gates: PlanFeatures;
}

export function validatePricingConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = Object.entries(PLANS).filter(([, p]) => p.price > 0 && !p.priceId).map(([k]) => k);
  if (missing.length > 0) {
    console.error(`[plans] FATAL: Missing Stripe price IDs for paid plans: ${missing.join(', ')}`);
    console.error('[plans] Set STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_SCALE env vars.');
    process.exit(1);
  }
}

const FREE_GATES: PlanFeatures = {
  failureInbox: false, sessionReplay: false, agentHealth: false,
  emailEscalation: false, abExperiments: false, auditLog: false,
  guardrails: false, slackEscalation: false, customRetention: false,
  sso: false, multilingual: true,
};
const STARTER_GATES: PlanFeatures = {
  failureInbox: true, sessionReplay: true, agentHealth: true,
  emailEscalation: true, abExperiments: false, auditLog: false,
  guardrails: false, slackEscalation: false, customRetention: false,
  sso: false, multilingual: true,
};
const GROWTH_GATES: PlanFeatures = {
  failureInbox: true, sessionReplay: true, agentHealth: true,
  emailEscalation: true, abExperiments: true, auditLog: true,
  guardrails: true, slackEscalation: true, customRetention: false,
  sso: false, multilingual: true,
};
const SCALE_GATES: PlanFeatures = {
  failureInbox: true, sessionReplay: true, agentHealth: true,
  emailEscalation: true, abExperiments: true, auditLog: true,
  guardrails: true, slackEscalation: true, customRetention: true,
  sso: true, multilingual: true,
};

export const PLANS: Record<string, Plan> = {
  free: {
    name: 'Free',
    monthlyMessageLimit: 1_000,
    agentLimit: 3,
    mtuLimit: 100,
    mcpConnectorLimit: 3,
    priceId: null,
    price: 0,
    inrPrice: 0,
    featureList: [
      'Up to 3 AI agents',
      '100 Monthly Tracked Users',
      'White-label widget',
      'MCP connectors',
      'Knowledge base',
      'Basic analytics',
      'Multilingual support (Hindi, Hinglish + 8 Indian languages)',
      'Community support',
    ],
    gates: FREE_GATES,
  },
  starter: {
    name: 'Starter',
    monthlyMessageLimit: 5_000,
    agentLimit: 10,
    mtuLimit: 1_000,
    mcpConnectorLimit: 0,
    priceId: process.env.STRIPE_PRICE_STARTER ?? null,
    price: 99,
    inrPrice: 7_999,
    featureList: [
      'Up to 10 AI agents',
      '1,000 Monthly Tracked Users',
      'Failure inbox',
      'Session replay',
      'Agent health panel',
      'Email escalation alerts',
      'Advanced analytics',
      'Multilingual support',
      'Email support (24h)',
    ],
    gates: STARTER_GATES,
  },
  growth: {
    name: 'Growth',
    monthlyMessageLimit: 25_000,
    agentLimit: 0,
    mtuLimit: 10_000,
    mcpConnectorLimit: 0,
    priceId: process.env.STRIPE_PRICE_GROWTH ?? null,
    price: 299,
    inrPrice: 24_999,
    featureList: [
      'Unlimited AI agents',
      '10,000 Monthly Tracked Users',
      'A/B flow experiments',
      'Audit log (90-day retention)',
      'Guardrails + sensitive field masking',
      'Slack escalation integration',
      'Priority email support',
      'Multilingual support',
    ],
    gates: GROWTH_GATES,
  },
  scale: {
    name: 'Scale',
    monthlyMessageLimit: 999_999,
    agentLimit: 0,
    mtuLimit: 0,
    mcpConnectorLimit: 0,
    priceId: process.env.STRIPE_PRICE_SCALE ?? null,
    price: 999,
    inrPrice: 79_999,
    featureList: [
      'Unlimited AI agents + MTU',
      'Custom audit log retention',
      'SSO / SAML',
      'SLA (99.9% uptime)',
      'Dedicated onboarding call',
      'Dedicated Slack support channel',
      'Custom contract',
      'Multilingual support',
    ],
    gates: SCALE_GATES,
  },
};

// Map a Stripe price ID back to a plan key
export function planFromPriceId(priceId: string): string | null {
  const entry = Object.entries(PLANS).find(([, p]) => p.priceId && p.priceId === priceId);
  return entry?.[0] ?? null;
}
