// ─── Escalations routes (JWT-protected, dashboard only) ──────────────────────
//
// GET    /api/v1/escalations          — list tickets (filter by status)
// GET    /api/v1/escalations/:id      — single ticket with full context
// PATCH  /api/v1/escalations/:id      — update status / notes

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/escalations ──────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query as { status?: string };

  const tickets = await prisma.escalationTicket.findMany({
    where: {
      organizationId: req.user!.organizationId,
      ...(status ? { status } : {}),
    },
    include: {
      endUser: { select: { externalId: true, metadata: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const counts = await prisma.escalationTicket.groupBy({
    by: ['status'],
    where: { organizationId: req.user!.organizationId },
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));

  res.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      status: t.status,
      trigger: t.trigger,
      reason: t.reason,
      agentMessage: t.agentMessage,
      notes: t.notes,
      userId: t.endUser.externalId,
      userMetadata: t.endUser.metadata,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
    })),
    counts: {
      open: countMap['open'] ?? 0,
      in_progress: countMap['in_progress'] ?? 0,
      resolved: countMap['resolved'] ?? 0,
    },
  });
});

// ─── GET /api/v1/escalations/:id ─────────────────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const ticket = await prisma.escalationTicket.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    include: {
      endUser: { select: { externalId: true, metadata: true, firstSeenAt: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json({ ticket: {
    id: ticket.id,
    status: ticket.status,
    trigger: ticket.trigger,
    reason: ticket.reason,
    agentMessage: ticket.agentMessage,
    notes: ticket.notes,
    context: ticket.context,
    userId: ticket.endUser.externalId,
    userMetadata: ticket.endUser.metadata,
    userFirstSeen: ticket.endUser.firstSeenAt,
    sessionId: ticket.sessionId,
    stepId: ticket.stepId,
    createdAt: ticket.createdAt,
    resolvedAt: ticket.resolvedAt,
  }});
});

// ─── PATCH /api/v1/escalations/:id ───────────────────────────────────────────
const VALID_TICKET_STATUSES = new Set(['open', 'in_progress', 'resolved']);

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { status, notes } = req.body as { status?: string; notes?: string };

  if (status !== undefined && !VALID_TICKET_STATUSES.has(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${[...VALID_TICKET_STATUSES].join(', ')}` });
    return;
  }

  const ticket = await prisma.escalationTicket.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const updated = await prisma.escalationTicket.update({
    where: { id: req.params.id },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(status === 'resolved' && ticket.status !== 'resolved' ? { resolvedAt: new Date() } : {}),
    },
  });

  res.json({ ticket: updated });
});

export default router;
