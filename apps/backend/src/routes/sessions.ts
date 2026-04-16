// ─── Dashboard-facing session detail routes ────────────────────────────────
// Separate from session.ts (which is widget-facing, API-key auth).

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/sessions/audit ──────────────────────────────────────────────
// Dashboard audit log — every AI action for this org (JWT auth).
// Must be before /:id to avoid route conflict.
router.get('/audit', async (req: AuthenticatedRequest, res: Response) => {
  const orgId  = req.user!.organizationId;
  const limit  = Math.min(Number(req.query.limit ?? 100), 200);
  const offset = Number(req.query.offset ?? 0);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        sessionId: true,
        endUserId: true,
        stepId: true,
        actionType: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where: { organizationId: orgId } }),
  ]);

  res.json({ logs, total });
});

// ─── GET /api/v1/sessions/:id ─────────────────────────────────────────────────
// Full session detail: flow, steps with progress, collected data, user info.
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;

  const session = await prisma.userOnboardingSession.findFirst({
    where: { id: req.params.id, organizationId },
    include: {
      flow: {
        include: {
          steps: { orderBy: { order: 'asc' } },
        },
      },
      endUser: {
        select: {
          id: true,
          externalId: true,
          metadata: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
      },
      stepProgress: true,
    },
  });

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Merge flow steps with their progress records
  const steps = session.flow.steps.map((step) => {
    const progress = session.stepProgress.find((p) => p.stepId === step.id);
    return {
      stepId: step.id,
      order: step.order,
      title: step.title,
      intent: step.intent,
      isMilestone: step.isMilestone,
      actionType: step.actionType,
      status: progress?.status ?? 'not_started',
      startedAt: progress?.startedAt ?? null,
      completedAt: progress?.completedAt ?? null,
      timeSpentMs: progress?.timeSpentMs ?? 0,
      messagesCount: progress?.messagesCount ?? 0,
      aiAssisted: progress?.aiAssisted ?? false,
      attempts: progress?.attempts ?? 0,
      outcome: progress?.outcome ?? null,
      dropReason: progress?.dropReason ?? null,
    };
  });

  res.json({
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      lastActiveAt: session.lastActiveAt,
      firstValueAt: session.firstValueAt,
      collectedData: session.collectedData,
      flow: {
        id: session.flow.id,
        name: session.flow.name,
      },
      endUser: session.endUser,
      steps,
    },
  });
});

export default router;
