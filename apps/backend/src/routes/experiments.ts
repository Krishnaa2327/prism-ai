// ─── A/B Flow Experiments ─────────────────────────────────────────────────────
// GET    /api/v1/experiments                — list experiments for org
// POST   /api/v1/experiments                — create experiment
// GET    /api/v1/experiments/:id/results    — detailed results (side-by-side stats)
// PUT    /api/v1/experiments/:id            — update status / declare winner

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/experiments ──────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const experiments = await prisma.flowExperiment.findMany({
    where: { organizationId: orgId },
    include: {
      controlFlow: { select: { id: true, name: true } },
      variantFlow:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Attach session counts per experiment
  const withCounts = await Promise.all(
    experiments.map(async (exp) => {
      const [controlSessions, variantSessions] = await Promise.all([
        prisma.userOnboardingSession.count({ where: { experimentId: exp.id, experimentVariant: 'control' } }),
        prisma.userOnboardingSession.count({ where: { experimentId: exp.id, experimentVariant: 'variant' } }),
      ]);
      return { ...exp, controlSessions, variantSessions };
    })
  );

  res.json({ experiments: withCounts });
});

// ─── POST /api/v1/experiments ─────────────────────────────────────────────────
const CreateSchema = z.object({
  name:          z.string().min(1).max(120),
  controlFlowId: z.string().uuid(),
  variantFlowId: z.string().uuid(),
  trafficSplit:  z.number().int().min(1).max(99).default(50),
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const body = CreateSchema.parse(req.body);

  // Verify both flows belong to this org
  const flows = await prisma.onboardingFlow.findMany({
    where: { id: { in: [body.controlFlowId, body.variantFlowId] }, organizationId: orgId },
    select: { id: true },
  });
  if (flows.length !== 2) {
    res.status(400).json({ error: 'Both flows must belong to your organization' });
    return;
  }

  // Only one running experiment per control flow
  const existing = await prisma.flowExperiment.findFirst({
    where: { organizationId: orgId, controlFlowId: body.controlFlowId, status: 'running' },
  });
  if (existing) {
    res.status(409).json({ error: 'A running experiment already exists for this flow. Conclude it before creating a new one.' });
    return;
  }

  const experiment = await prisma.flowExperiment.create({
    data: { organizationId: orgId, ...body },
    include: {
      controlFlow: { select: { id: true, name: true } },
      variantFlow:  { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ experiment });
});

// ─── GET /api/v1/experiments/:id/results ─────────────────────────────────────
router.get('/:id/results', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const exp = await prisma.flowExperiment.findFirst({
    where: { id: req.params.id, organizationId: orgId },
    include: {
      controlFlow: { include: { steps: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } } } },
      variantFlow:  { include: { steps: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } } } },
    },
  });
  if (!exp) { res.status(404).json({ error: 'Experiment not found' }); return; }

  async function armStats(flowId: string, variant: 'control' | 'variant') {
    const sessions = await prisma.userOnboardingSession.findMany({
      where: { experimentId: exp!.id, experimentVariant: variant },
      select: {
        id: true, status: true, startedAt: true, completedAt: true,
        stepProgress: { select: { stepId: true, status: true, timeSpentMs: true } },
      },
    });

    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Avg time to complete (only completed sessions)
    const completedSessions = sessions.filter((s) => s.completedAt && s.startedAt);
    const avgTimeMs = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.completedAt!.getTime() - s.startedAt.getTime()), 0) / completedSessions.length
      : null;

    // Per-step completion rates using step IDs from the flow
    const flow = variant === 'control' ? exp!.controlFlow : exp!.variantFlow;
    const stepStats = flow.steps.map((step) => {
      const progressEntries = sessions.flatMap((s) => s.stepProgress.filter((p) => p.stepId === step.id));
      const stepCompleted = progressEntries.filter((p) => p.status === 'completed').length;
      return {
        stepId: step.id,
        title: step.title,
        order: step.order,
        completionRate: total > 0 ? Math.round((stepCompleted / total) * 100) : 0,
      };
    });

    return { total, completed, completionRate, avgTimeMs, stepStats };
  }

  const [controlStats, variantStats] = await Promise.all([
    armStats(exp.controlFlowId, 'control'),
    armStats(exp.variantFlowId, 'variant'),
  ]);

  // Statistical significance (simple two-proportion z-test)
  const n1 = controlStats.total, p1 = controlStats.completed / Math.max(n1, 1);
  const n2 = variantStats.total,  p2 = variantStats.completed  / Math.max(n2, 1);
  const pPool = (controlStats.completed + variantStats.completed) / Math.max(n1 + n2, 1);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / Math.max(n1, 1) + 1 / Math.max(n2, 1)));
  const zScore = se > 0 ? Math.abs(p2 - p1) / se : 0;
  const significant = zScore >= 1.96 && n1 >= 30 && n2 >= 30; // 95% confidence, min 30/arm

  res.json({
    experiment: {
      id: exp.id, name: exp.name, status: exp.status,
      trafficSplit: exp.trafficSplit, winnerId: exp.winnerId,
      startedAt: exp.startedAt, concludedAt: exp.concludedAt,
      controlFlow: { id: exp.controlFlow.id, name: exp.controlFlow.name },
      variantFlow:  { id: exp.variantFlow.id,  name: exp.variantFlow.name  },
    },
    control: controlStats,
    variant: variantStats,
    significant,
    zScore: Math.round(zScore * 100) / 100,
    lift: controlStats.completionRate > 0
      ? Math.round(((variantStats.completionRate - controlStats.completionRate) / controlStats.completionRate) * 100)
      : null,
  });
});

// ─── PUT /api/v1/experiments/:id ─────────────────────────────────────────────
const UpdateSchema = z.object({
  status:   z.enum(['running', 'paused', 'concluded']).optional(),
  winnerId: z.string().nullable().optional(),
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const body = UpdateSchema.parse(req.body);

  const exp = await prisma.flowExperiment.findFirst({
    where: { id: req.params.id, organizationId: orgId },
  });
  if (!exp) { res.status(404).json({ error: 'Experiment not found' }); return; }

  const updated = await prisma.flowExperiment.update({
    where: { id: req.params.id },
    data: {
      ...body,
      concludedAt: body.status === 'concluded' ? new Date() : undefined,
    },
  });

  res.json({ experiment: updated });
});

export default router;
