import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ─── Admin auth middleware ────────────────────────────────────────────────────
// Protected by X-Admin-Secret header — set ADMIN_SECRET in your .env
function requireAdmin(req: Request, res: Response, next: () => void) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Admin access not configured (set ADMIN_SECRET)' });
    return;
  }
  if (req.headers['x-admin-secret'] !== secret) {
    res.status(401).json({ error: 'Invalid admin secret' });
    return;
  }
  next();
}

// ─── GET /api/v1/admin/orgs ───────────────────────────────────────────────────
// Lists all organizations with usage stats — founders dashboard for monitoring beta customers.
// Usage: curl -H "X-Admin-Secret: $ADMIN_SECRET" https://api.onboardai.com/api/v1/admin/orgs
router.get('/orgs', requireAdmin, async (_req: Request, res: Response) => {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      users: { select: { email: true, name: true, role: true, lastLoginAt: true } },
      _count: {
        select: {
          conversations: true,
          events: true,
          endUsers: true,
        },
      },
    },
  });

  const result = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    plan: org.planType,
    subscriptionStatus: org.subscriptionStatus,
    createdAt: org.createdAt,
    owner: org.users.find((u) => u.role === 'owner') ?? org.users[0] ?? null,
    usage: {
      conversations: org._count.conversations,
      endUsers: org._count.endUsers,
      events: org._count.events,
    },
  }));

  res.json({
    total: result.length,
    paying: result.filter((o) => o.plan !== 'free').length,
    orgs: result,
  });
});

// ─── GET /api/v1/admin/orgs/:id ───────────────────────────────────────────────
// Deep dive into a specific org — conversations list, recent events, billing info.
router.get('/orgs/:id', requireAdmin, async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      users: { select: { email: true, name: true, role: true, lastLoginAt: true, createdAt: true } },
      _count: { select: { conversations: true, endUsers: true, events: true } },
    },
  });

  if (!org) {
    res.status(404).json({ error: 'Org not found' });
    return;
  }

  const recentConversations = await prisma.conversation.findMany({
    where: { organizationId: org.id },
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: { _count: { select: { messages: true } } },
  });

  res.json({
    id: org.id,
    name: org.name,
    apiKey: org.apiKey,
    plan: org.planType,
    subscriptionStatus: org.subscriptionStatus,
    currentPeriodEnd: org.currentPeriodEnd,
    customInstructions: org.customInstructions,
    createdAt: org.createdAt,
    users: org.users,
    usage: {
      conversations: org._count.conversations,
      endUsers: org._count.endUsers,
      events: org._count.events,
    },
    recentConversations: recentConversations.map((c) => ({
      id: c.id,
      triggeredBy: c.triggeredBy,
      status: c.status,
      messageCount: c._count.messages,
      startedAt: c.startedAt,
    })),
  });
});

export default router;
