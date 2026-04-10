// ─── Selector Heal Logging + Flow Health API ─────────────────────────────────
// POST /api/v1/session/heal   — widget reports a selector fallback or failure
// GET  /api/v1/flow/health    — dashboard: per-selector health per step (JWT)

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateApiKey, authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { fireSelectorAlert } from '../services/selectorAlert';

export const healWidgetRouter = Router();
export const healDashboardRouter = Router();

// ─── POST /api/v1/session/heal ────────────────────────────────────────────────
// Called by the widget whenever the resolver uses a fallback strategy or fails.
// API-key authenticated (same as other widget endpoints).
healWidgetRouter.use(authenticateApiKey);
healWidgetRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const {
    sessionId,
    stepId,
    originalSelector,
    usedSelector,
    strategy,
    actionType,
    page,
  } = req.body as {
    sessionId?: string;
    stepId?: string;
    originalSelector: string;
    usedSelector?: string;
    strategy: string;
    actionType?: string;
    page: string;
  };

  if (!originalSelector || !strategy || !page) {
    res.status(400).json({ error: 'originalSelector, strategy, page required' });
    return;
  }

  const newLog = await prisma.selectorHealLog.create({
    data: {
      organizationId:   req.organization!.id,
      sessionId:        sessionId ?? null,
      stepId:           stepId    ?? null,
      originalSelector,
      usedSelector:     usedSelector ?? null,
      strategy,
      actionType:       actionType ?? null,
      page,
    },
  });

  // Fire alert on the first failure for this selector in a 24-hour window
  if (strategy === 'failed') {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const priorFailCount = await prisma.selectorHealLog.count({
      where: {
        organizationId: req.organization!.id,
        originalSelector,
        strategy: 'failed',
        createdAt: { gte: oneDayAgo },
        NOT: { id: newLog.id },
      },
    });

    if (priorFailCount === 0) {
      // First failure in the window — enrich with step info and fire alert
      let stepTitle: string | null = null;
      let flowName: string | null = null;
      if (stepId) {
        const step = await prisma.onboardingStep.findUnique({
          where: { id: stepId },
          select: { title: true, flow: { select: { name: true } } },
        });
        stepTitle = step?.title ?? null;
        flowName = step?.flow.name ?? null;
      }
      fireSelectorAlert({
        organizationId: req.organization!.id,
        originalSelector,
        page,
        stepTitle,
        flowName,
      }).catch(() => {}); // never block the response
    }
  }

  res.json({ ok: true });
});

// ─── GET /api/v1/flow/health ──────────────────────────────────────────────────
// Returns per-selector health aggregated over the last 30 days.
// Status:
//   healthy  — 0 heal/fail events
//   healing  — has fallback events but no failures
//   failing  — has at least one 'failed' event
//
// Each entry also carries the step name + flow name so the dashboard can
// show exactly which step is affected.
healDashboardRouter.use(authenticateJWT);
healDashboardRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all logs in the window
  const logs = await prisma.selectorHealLog.findMany({
    where: { organizationId: orgId, createdAt: { gte: since } },
    select: {
      originalSelector: true,
      usedSelector: true,
      strategy: true,
      actionType: true,
      page: true,
      stepId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregate per originalSelector
  const map = new Map<string, {
    originalSelector: string;
    stepId: string | null;
    page: string;
    actionType: string | null;
    healCount: number;
    failCount: number;
    lastSeen: Date;
    strategies: Set<string>;
    usedSelectors: Set<string>;
  }>();

  for (const log of logs) {
    const key = log.originalSelector;
    if (!map.has(key)) {
      map.set(key, {
        originalSelector: key,
        stepId: log.stepId,
        page: log.page,
        actionType: log.actionType,
        healCount: 0,
        failCount: 0,
        lastSeen: log.createdAt,
        strategies: new Set(),
        usedSelectors: new Set(),
      });
    }
    const entry = map.get(key)!;
    if (log.strategy === 'failed') {
      entry.failCount++;
    } else {
      entry.healCount++;
    }
    entry.strategies.add(log.strategy);
    if (log.usedSelector) entry.usedSelectors.add(log.usedSelector);
    if (log.createdAt > entry.lastSeen) entry.lastSeen = log.createdAt;
  }

  // Enrich with step + flow names
  const stepIds = [...new Set([...map.values()].map((e) => e.stepId).filter(Boolean))] as string[];
  const steps = stepIds.length > 0
    ? await prisma.onboardingStep.findMany({
        where: { id: { in: stepIds } },
        select: { id: true, title: true, flow: { select: { id: true, name: true } } },
      })
    : [];
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  const entries = [...map.values()].map((e) => {
    const step = e.stepId ? stepMap.get(e.stepId) : null;
    const status: 'healthy' | 'healing' | 'failing' =
      e.failCount > 0 ? 'failing' : e.healCount > 0 ? 'healing' : 'healthy';
    return {
      originalSelector: e.originalSelector,
      status,
      healCount: e.healCount,
      failCount: e.failCount,
      lastSeen: e.lastSeen,
      actionType: e.actionType,
      page: e.page,
      strategies: [...e.strategies],
      suggestedSelector: e.usedSelectors.size > 0 ? [...e.usedSelectors][0] : null,
      step: step ? { id: step.id, title: step.title, flowId: step.flow.id, flowName: step.flow.name } : null,
    };
  });

  // Sort: failing first, then healing, then healthy; within group by lastSeen desc
  const order = { failing: 0, healing: 1, healthy: 2 };
  entries.sort((a, b) =>
    order[a.status] - order[b.status] ||
    b.lastSeen.getTime() - a.lastSeen.getTime()
  );

  res.json({ entries, total: entries.length, since });
});
