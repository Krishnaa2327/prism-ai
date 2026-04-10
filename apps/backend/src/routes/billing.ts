import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { stripe } from '../lib/stripe';
import { prisma } from '../lib/prisma';
import { PLANS, planFromPriceId } from '../lib/plans';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getMonthlyUsage } from '../middleware/rateLimit';

const router = Router();

// ─── GET /api/v1/billing/status ──────────────────────────────────────────────
// Dashboard polls this to show current plan, usage, next bill date
router.get('/status', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      planType: true,
      monthlyMessageLimit: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  const used = await getMonthlyUsage(organizationId);
  const plan = PLANS[org.planType] ?? PLANS.free;

  res.json({
    plan: org.planType,
    planName: plan.name,
    price: plan.price,
    monthlyMessageLimit: org.monthlyMessageLimit,
    messagesUsedThisMonth: used,
    subscriptionStatus: org.subscriptionStatus,
    currentPeriodEnd: org.currentPeriodEnd,
    hasStripeCustomer: !!org.stripeCustomerId,
    plans: Object.entries(PLANS).map(([key, p]) => ({
      key,
      name: p.name,
      price: p.price,
      limit: p.monthlyMessageLimit,
      current: key === org.planType,
    })),
  });
});

// ─── POST /api/v1/billing/checkout ──────────────────────────────────────────
// Creates a Stripe Checkout Session → returns URL to redirect to
const CheckoutSchema = z.object({
  priceId: z.string().min(1),
});

router.post('/checkout', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;
  const { priceId } = CheckoutSchema.parse(req.body);

  // Validate priceId is one of our known plans
  const planEntry = Object.entries(PLANS).find(([, p]) => p.priceId === priceId);
  if (!planEntry) {
    res.status(400).json({ error: 'Invalid price ID' });
    return;
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true, stripeCustomerId: true },
    include: { users: { where: { role: 'owner' }, select: { email: true }, take: 1 } },
  });

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    // Attach existing Stripe customer if we have one, else let Stripe create one
    ...(org.stripeCustomerId
      ? { customer: org.stripeCustomerId }
      : { customer_email: org.users[0]?.email }),
    client_reference_id: organizationId,   // we read this in the webhook
    success_url: `${frontendUrl}/settings/billing?success=1`,
    cancel_url: `${frontendUrl}/settings/billing?canceled=1`,
    metadata: { organizationId },
  });

  res.json({ url: session.url });
});

// ─── POST /api/v1/billing/portal ────────────────────────────────────────────
// Opens Stripe Customer Portal (manage subscription, download invoices, cancel)
router.post('/portal', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });

  if (!org.stripeCustomerId) {
    res.status(400).json({ error: 'No active subscription. Upgrade first.' });
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${frontendUrl}/settings/billing`,
  });

  res.json({ url: session.url });
});

// ─── POST /api/v1/billing/webhook ────────────────────────────────────────────
// Stripe calls this when subscription events happen.
// Must use raw body (not JSON-parsed) so the signature check works.
// Mounted in index.ts BEFORE express.json() middleware.
export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    res.status(400).json({ error: msg });
    return;
  }

  // Helper to update org from a subscription object
  async function syncSubscription(subscription: import('stripe').Stripe.Subscription) {
    const organizationId = subscription.metadata?.organizationId
      ?? (await prisma.organization.findFirst({
           where: { stripeCustomerId: subscription.customer as string },
           select: { id: true },
         }))?.id;

    if (!organizationId) return;

    const priceId = subscription.items.data[0]?.price.id ?? '';
    const planKey = planFromPriceId(priceId);
    const plan = PLANS[planKey] ?? PLANS.free;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeCustomerId:     subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId:        priceId,
        planType:             planKey,
        monthlyMessageLimit:  plan.monthlyMessageLimit,
        subscriptionStatus:   subscription.status,
        currentPeriodEnd:     new Date(subscription.current_period_end * 1000),
      },
    });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      // Link Stripe customer to our org on first checkout
      const session = event.data.object as import('stripe').Stripe.Checkout.Session;
      if (session.client_reference_id && session.customer) {
        await prisma.organization.update({
          where: { id: session.client_reference_id },
          data: { stripeCustomerId: session.customer as string },
        });
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object as import('stripe').Stripe.Subscription);
      break;

    case 'customer.subscription.deleted': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const org = await prisma.organization.findFirst({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            planType:            'free',
            monthlyMessageLimit: PLANS.free.monthlyMessageLimit,
            subscriptionStatus:  'canceled',
            stripeSubscriptionId: null,
            stripePriceId:       null,
            currentPeriodEnd:    null,
          },
        });
      }
      break;
    }
  }

  res.json({ received: true });
}

export default router;
