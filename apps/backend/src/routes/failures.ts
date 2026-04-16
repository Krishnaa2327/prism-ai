import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

/**
 * GET /api/v1/failures
 * Sessions where the user dropped off or the AI hit an error.
 * "Dropped off" = active session with no activity in 30 minutes + < 100% steps done.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const [stuckSessions, recentEscalations] = await Promise.all([
    // Sessions that went quiet mid-flow
    prisma.userOnboardingSession.findMany({
      where: {
        organizationId: orgId,
        status: 'active',
        lastActiveAt: { lt: thirtyMinutesAgo },
      },
      include: {
        flow: { select: { name: true, steps: { select: { id: true } } } },
        endUser: { select: { externalId: true } },
        stepProgress: { select: { stepId: true, status: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 50,
    }),

    // Recent escalations (user explicitly asked for help)
    prisma.escalationTicket.findMany({
      where: { organizationId: orgId, status: 'open' },
      include: { endUser: { select: { externalId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const failures = stuckSessions.map((s) => {
    const totalSteps = s.flow.steps.length;
    const completedSteps = s.stepProgress.filter((p) => p.status === 'completed').length;
    const stuckAt = s.flow.steps.find((step) =>
      !s.stepProgress.some((p) => p.stepId === step.id && p.status === 'completed')
    );
    const minutesAgo = Math.floor((Date.now() - s.lastActiveAt.getTime()) / 60000);

    return {
      sessionId: s.id,
      userId: s.endUser.externalId,
      flowName: s.flow.name,
      completedSteps,
      totalSteps,
      progressPct: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      stuckAtStepId: stuckAt?.id ?? null,
      lastActiveMinutesAgo: minutesAgo,
      type: 'dropped_off' as const,
    };
  });

  // Batch-fetch flow names for escalation sessions (EscalationTicket has no direct flow relation)
  const escalationSessionIds = recentEscalations.map((e) => e.sessionId);
  const escalationSessions = escalationSessionIds.length > 0
    ? await prisma.userOnboardingSession.findMany({
        where: { id: { in: escalationSessionIds } },
        select: { id: true, flow: { select: { name: true } } },
      })
    : [];
  const sessionFlowMap = new Map(escalationSessions.map((s) => [s.id, s.flow.name]));

  res.json({
    failures,
    escalations: recentEscalations.map((e) => ({
      ticketId: e.id,
      userId: e.endUser.externalId,
      sessionId: e.sessionId,
      flowName: sessionFlowMap.get(e.sessionId) ?? 'Unknown flow',
      reason: e.reason,
      createdAt: e.createdAt,
      status: e.status,
    })),
    summary: {
      droppedOff: failures.length,
      openEscalations: recentEscalations.length,
    },
  });
});

export default router;
