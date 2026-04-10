// ─── Users routes (JWT-protected, dashboard only) ────────────────────────────
//
// GET /api/v1/users                    — paginated list of all end users
// GET /api/v1/users/:userId/history    — full session history for one user

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const offset = Number(req.query.offset ?? 0);

  const [users, total] = await Promise.all([
    prisma.endUser.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        onboardingSessions: {
          include: {
            flow: { select: { name: true } },
            stepProgress: { where: { status: 'completed' }, select: { stepId: true } },
          },
          orderBy: { lastActiveAt: 'desc' },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.endUser.count({ where: { organizationId: req.user!.organizationId } }),
  ]);

  const formatted = users.map((u) => {
    const sessions = u.onboardingSessions;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const latest = sessions[0] ?? null;
    return {
      id: u.id,
      externalId: u.externalId,
      metadata: u.metadata,
      firstSeenAt: u.firstSeenAt,
      lastSeenAt: u.lastSeenAt,
      totalSessions: sessions.length,
      completedSessions: completed,
      latestSession: latest
        ? {
            flowName: latest.flow.name,
            status: latest.status,
            stepsCompleted: latest.stepProgress.length,
            lastActiveAt: latest.lastActiveAt,
          }
        : null,
    };
  });

  res.json({ users: formatted, total, hasMore: offset + limit < total });
});

// ─── GET /api/v1/users/:userId/history ───────────────────────────────────────
router.get('/:userId/history', async (req: AuthenticatedRequest, res: Response) => {
  const endUser = await prisma.endUser.findFirst({
    where: { id: req.params.userId, organizationId: req.user!.organizationId },
  });

  if (!endUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const sessions = await prisma.userOnboardingSession.findMany({
    where: { endUserId: endUser.id },
    include: {
      flow: { select: { id: true, name: true } },
      stepProgress: {
        include: { step: { select: { title: true, order: true, intent: true } } },
        orderBy: { step: { order: 'asc' } },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  // Merge all collected data across sessions (most recent wins)
  const mergedData: Record<string, unknown> = {};
  for (const s of [...sessions].reverse()) {
    Object.assign(mergedData, s.collectedData as Record<string, unknown>);
  }

  const history = sessions.map((s) => ({
    sessionId: s.id,
    flowId: s.flow.id,
    flowName: s.flow.name,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    lastActiveAt: s.lastActiveAt,
    firstValueAt: s.firstValueAt,
    collectedData: s.collectedData,
    steps: s.stepProgress.map((p) => ({
      stepId: p.stepId,
      title: p.step.title,
      order: p.step.order,
      intent: p.step.intent,
      status: p.status,
      completedAt: p.completedAt,
      timeSpentMs: p.timeSpentMs,
      messagesCount: p.messagesCount,
      aiAssisted: p.aiAssisted,
    })),
  }));

  res.json({
    user: {
      id: endUser.id,
      externalId: endUser.externalId,
      metadata: endUser.metadata,
      firstSeenAt: endUser.firstSeenAt,
      lastSeenAt: endUser.lastSeenAt,
    },
    sessions: history,
    mergedCollectedData: mergedData,
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.status === 'completed').length,
  });
});

export default router;
