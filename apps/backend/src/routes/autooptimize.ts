import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { runAutoOptimization } from '../services/autooptimize';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/autooptimize/settings ───────────────────────────────────────
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const config = await prisma.autoOptimizeConfig.findUnique({
    where: { organizationId: orgId },
  });

  res.json({
    enabled: config?.enabled ?? false,
    threshold: config?.threshold ?? 50,
    minSessions: config?.minSessions ?? 10,
    lastRunAt: config?.lastRunAt?.toISOString() ?? null,
  });
});

// ─── PUT /api/v1/autooptimize/settings ───────────────────────────────────────
router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const { enabled, threshold, minSessions } = req.body as {
    enabled?: boolean;
    threshold?: number;
    minSessions?: number;
  };

  const config = await prisma.autoOptimizeConfig.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      enabled: enabled ?? false,
      threshold: threshold ?? 50,
      minSessions: minSessions ?? 10,
    },
    update: {
      ...(enabled !== undefined && { enabled }),
      ...(threshold !== undefined && { threshold: Math.min(Math.max(threshold, 20), 90) }),
      ...(minSessions !== undefined && { minSessions: Math.min(Math.max(minSessions, 3), 100) }),
    },
  });

  res.json({
    enabled: config.enabled,
    threshold: config.threshold,
    minSessions: config.minSessions,
    lastRunAt: config.lastRunAt?.toISOString() ?? null,
  });
});

// ─── POST /api/v1/autooptimize/run ───────────────────────────────────────────
// Manually trigger an optimization scan
router.post('/run', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const result = await runAutoOptimization(orgId, 'manual');
  res.json(result);
});

// ─── GET /api/v1/autooptimize/log ────────────────────────────────────────────
// View optimization history
router.get('/log', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  const logs = await prisma.optimizationLog.findMany({
    where: { organizationId: orgId },
    orderBy: { appliedAt: 'desc' },
    take: limit,
    include: {
      step: { select: { title: true, intent: true } },
    },
  });

  const formatted = logs.map((log) => ({
    id: log.id,
    stepId: log.stepId,
    stepTitle: log.step.title,
    stepIntent: log.step.intent,
    triggeredBy: log.triggeredBy,
    completionRateBefore: log.completionRateBefore,
    previousPrompt: log.previousPrompt,
    newPrompt: log.newPrompt,
    reason: log.reason,
    appliedAt: log.appliedAt.toISOString(),
  }));

  res.json({ logs: formatted, total: formatted.length });
});

export default router;
