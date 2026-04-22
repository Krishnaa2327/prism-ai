import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/activation/overview ─────────────────────────────────────────
// Summary stats: sessions started, completion rate, avg time-to-value
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const [totalSessions, completedSessions, sessionsWithFirstValue] = await Promise.all([
    prisma.userOnboardingSession.count({ where: { organizationId: orgId } }),
    prisma.userOnboardingSession.count({ where: { organizationId: orgId, status: 'completed' } }),
    prisma.userOnboardingSession.findMany({
      where: { organizationId: orgId, firstValueAt: { not: null } },
      select: { startedAt: true, firstValueAt: true },
    }),
  ]);

  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  // avg time from session start to first value in minutes
  const avgTimeToValueMs =
    sessionsWithFirstValue.length > 0
      ? sessionsWithFirstValue.reduce((sum, s) => {
          return sum + (s.firstValueAt!.getTime() - s.startedAt.getTime());
        }, 0) / sessionsWithFirstValue.length
      : null;

  res.json({
    totalSessions,
    completedSessions,
    completionRate: Math.round(completionRate * 10) / 10,
    firstValueCount: sessionsWithFirstValue.length,
    avgTimeToValueMins: avgTimeToValueMs !== null ? Math.round(avgTimeToValueMs / 60000) : null,
  });
});

// ─── GET /api/v1/activation/funnel ────────────────────────────────────────────
// Drop-off funnel: for each step, how many users started vs completed it
router.get('/funnel', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  // get the active flow
  const flow = await prisma.onboardingFlow.findFirst({
    where: { organizationId: orgId, isActive: true },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!flow) {
    res.json({ funnel: [], flowName: null });
    return;
  }

  const totalSessions = await prisma.userOnboardingSession.count({
    where: { organizationId: orgId, flowId: flow.id },
  });

  const funnel = await Promise.all(
    flow.steps.map(async (step) => {
      const [started, completed, aiAssisted] = await Promise.all([
        prisma.userStepProgress.count({
          where: { stepId: step.id, status: { in: ['in_progress', 'completed'] } },
        }),
        prisma.userStepProgress.count({
          where: { stepId: step.id, status: 'completed' },
        }),
        prisma.userStepProgress.count({
          where: { stepId: step.id, status: 'completed', aiAssisted: true },
        }),
      ]);

      // avg time on step (for completed steps)
      const timings = await prisma.userStepProgress.findMany({
        where: { stepId: step.id, status: 'completed', timeSpentMs: { gt: 0 } },
        select: { timeSpentMs: true },
      });
      const avgTimeMs =
        timings.length > 0
          ? timings.reduce((s, t) => s + t.timeSpentMs, 0) / timings.length
          : null;

      return {
        stepId: step.id,
        stepTitle: step.title,
        order: step.order,
        isMilestone: step.isMilestone,
        started,
        completed,
        dropOff: started - completed,
        dropOffRate: started > 0 ? Math.round(((started - completed) / started) * 100) : 0,
        aiAssistedRate: completed > 0 ? Math.round((aiAssisted / completed) * 100) : 0,
        avgTimeSecs: avgTimeMs !== null ? Math.round(avgTimeMs / 1000) : null,
      };
    })
  );

  res.json({
    flowName: flow.name,
    totalSessions,
    funnel,
  });
});

// ─── GET /api/v1/activation/timeline ─────────────────────────────────────────
// Sessions started per day (last 30 days)
router.get('/timeline', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const days = Number(req.query.days ?? 30);
  const since = new Date(Date.now() - days * 86_400_000);

  const sessions = await prisma.userOnboardingSession.findMany({
    where: { organizationId: orgId, startedAt: { gte: since } },
    select: { startedAt: true, status: true, firstValueAt: true },
    orderBy: { startedAt: 'asc' },
  });

  // bucket by date
  const byDate: Record<string, { started: number; completed: number; firstValue: number }> = {};
  for (const s of sessions) {
    const date = s.startedAt.toISOString().split('T')[0];
    if (!byDate[date]) byDate[date] = { started: 0, completed: 0, firstValue: 0 };
    byDate[date].started++;
    if (s.status === 'completed') byDate[date].completed++;
    if (s.firstValueAt) byDate[date].firstValue++;
  }

  res.json({
    timeline: Object.entries(byDate).map(([date, counts]) => ({ date, ...counts })),
  });
});

// ─── GET /api/v1/activation/trend ────────────────────────────────────────────
// This week vs last week comparison — feeds the dashboard improvement tracker
router.get('/trend', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const now = Date.now();
  const thisWeekStart = new Date(now - 7 * 86_400_000);
  const lastWeekStart = new Date(now - 14 * 86_400_000);

  const [thisWeekSessions, lastWeekSessions] = await Promise.all([
    prisma.userOnboardingSession.findMany({
      where: { organizationId: orgId, startedAt: { gte: thisWeekStart } },
      select: { status: true, firstValueAt: true },
    }),
    prisma.userOnboardingSession.findMany({
      where: { organizationId: orgId, startedAt: { gte: lastWeekStart, lt: thisWeekStart } },
      select: { status: true, firstValueAt: true },
    }),
  ]);

  function weekStats(sessions: Array<{ status: string; firstValueAt: Date | null }>) {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const firstValue = sessions.filter((s) => s.firstValueAt !== null).length;
    return {
      sessions: total,
      completed,
      firstValue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      firstValueRate: total > 0 ? Math.round((firstValue / total) * 100) : 0,
    };
  }

  const thisWeek = weekStats(thisWeekSessions);
  const lastWeek = weekStats(lastWeekSessions);

  function delta(current: number, previous: number): number {
    return current - previous;
  }

  res.json({
    thisWeek,
    lastWeek,
    deltas: {
      sessions: delta(thisWeek.sessions, lastWeek.sessions),
      completionRate: delta(thisWeek.completionRate, lastWeek.completionRate),
      firstValueRate: delta(thisWeek.firstValueRate, lastWeek.firstValueRate),
    },
  });
});

// ─── GET /api/v1/activation/flows ────────────────────────────────────────────
// Per-flow completion stats: completionRate, totalSessions, completedSessions
router.get('/flows', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const flows = await prisma.onboardingFlow.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const stats = await Promise.all(
    flows.map(async (flow) => {
      const [total, completed] = await Promise.all([
        prisma.userOnboardingSession.count({ where: { organizationId: orgId, flowId: flow.id } }),
        prisma.userOnboardingSession.count({ where: { organizationId: orgId, flowId: flow.id, status: 'completed' } }),
      ]);
      return {
        flowId: flow.id,
        flowName: flow.name,
        isActive: flow.isActive,
        totalSessions: total,
        completedSessions: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      };
    })
  );

  res.json({ flows: stats });
});

export default router;
