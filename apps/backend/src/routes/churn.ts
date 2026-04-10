/**
 * Churn risk — Phase 4
 *
 * Surfaces at-risk users who are likely to abandon onboarding.
 * Used by dashboard to show "users who need a nudge" and by
 * the widget (via API key) to decide when to show proactive interventions.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT, authenticateApiKey } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { scoreChurnRisk, buildSignals } from '../services/churn';

const router = Router();

// ─── GET /api/v1/churn/at-risk (dashboard — JWT) ──────────────────────────────
// Returns active sessions ranked by churn risk score
router.get('/at-risk', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const minScore = Number(req.query.minScore ?? 25);

  const sessions = await prisma.userOnboardingSession.findMany({
    where: {
      organizationId: orgId,
      status: { in: ['active', 'abandoned'] },
    },
    include: {
      endUser: { select: { externalId: true, metadata: true, firstSeenAt: true } },
      flow: { select: { name: true, steps: { select: { id: true }, orderBy: { order: 'asc' } } } },
      stepProgress: { select: { status: true, stepId: true } },
    },
    orderBy: { lastActiveAt: 'asc' }, // oldest last-active first
    take: 200, // score all, then filter
  });

  const scored = sessions
    .map((session) => {
      const signals = buildSignals(session);
      const churn = scoreChurnRisk(signals);
      return {
        sessionId: session.id,
        userId: session.endUser.externalId,
        userMetadata: session.endUser.metadata,
        flowName: session.flow.name,
        status: session.status,
        stepsCompleted: signals.stepsCompleted,
        totalSteps: signals.totalSteps,
        progressFraction: signals.progressFraction,
        lastActiveAt: session.lastActiveAt.toISOString(),
        startedAt: session.startedAt.toISOString(),
        firstSeenAt: session.endUser.firstSeenAt.toISOString(),
        currentStepId: session.currentStepId,
        ...churn,
      };
    })
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const breakdown = {
    critical: scored.filter((s) => s.risk === 'critical').length,
    high: scored.filter((s) => s.risk === 'high').length,
    medium: scored.filter((s) => s.risk === 'medium').length,
    total: scored.length,
  };

  res.json({ users: scored, breakdown });
});

// ─── GET /api/v1/churn/score (widget — API key) ───────────────────────────────
// Returns the churn score for a specific user — widget uses this for proactive nudges
router.get('/score', authenticateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.query as { userId: string };
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  const session = await prisma.userOnboardingSession.findFirst({
    where: {
      organizationId: req.organization!.id,
      status: { in: ['active', 'abandoned'] },
      endUser: { externalId: userId },
    },
    include: {
      flow: { select: { steps: { select: { id: true } } } },
      stepProgress: { select: { status: true } },
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  if (!session) {
    res.json({ score: 0, risk: 'low', shouldIntervene: false });
    return;
  }

  const signals = buildSignals(session);
  const churn = scoreChurnRisk(signals);

  res.json({
    ...churn,
    shouldIntervene: churn.score >= 50,
    sessionId: session.id,
  });
});

// ─── GET /api/v1/churn/summary (dashboard overview card) ─────────────────────
router.get('/summary', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const sessions = await prisma.userOnboardingSession.findMany({
    where: { organizationId: orgId, status: { in: ['active', 'abandoned'] } },
    include: {
      flow: { select: { steps: { select: { id: true } } } },
      stepProgress: { select: { status: true } },
    },
  });

  let critical = 0, high = 0, medium = 0, low = 0;
  for (const session of sessions) {
    const signals = buildSignals(session);
    const { risk } = scoreChurnRisk(signals);
    if (risk === 'critical') critical++;
    else if (risk === 'high') high++;
    else if (risk === 'medium') medium++;
    else low++;
  }

  res.json({
    total: sessions.length,
    breakdown: { critical, high, medium, low },
    atRisk: critical + high,
  });
});

export default router;
