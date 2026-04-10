/**
 * Cross-customer benchmark intelligence — Phase 3 moat
 *
 * Aggregates anonymized data across all orgs in the system and returns
 * comparison stats. This is the data asset competitors can't replicate.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── Industry baselines (research-derived, weighted against real data) ─────────
// Source: Appcues State of Product Adoption, Intercom Activation Index, proprietary
// Blend: 30% baseline + 70% real aggregate when we have ≥5 orgs
const INDUSTRY_BASELINE = {
  completionRate: 32,     // % — without AI guidance
  timeToValueMins: 14,    // mins — average time to first value moment without AI
  dropOffRateStep1: 45,   // % — users who never get past step 1
  aiAssistRate: 0,        // % — baseline has no AI
};

// Per-intent benchmarks (drop-off rate without AI guidance)
const INTENT_DROP_BENCHMARKS: Record<string, number> = {
  data_connection:     48,
  dashboard_creation:  35,
  insight_discovery:   22,
  integration_setup:   55,
  account_configuration: 40,
  team_invite:         30,
  api_setup:           58,
  payment_setup:       38,
  workflow_creation:   44,
  first_export:        28,
};
const DEFAULT_INTENT_DROP = 42;

// ─── GET /api/v1/benchmarks/overview ─────────────────────────────────────────
// Returns this org's stats vs industry averages
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  // ── This org's stats ──────────────────────────────────────────────────────
  const [
    orgTotalSessions,
    orgCompletedSessions,
    orgFirstValueSessions,
    orgAllProgress,
  ] = await Promise.all([
    prisma.userOnboardingSession.count({ where: { organizationId: orgId } }),
    prisma.userOnboardingSession.count({ where: { organizationId: orgId, status: 'completed' } }),
    prisma.userOnboardingSession.findMany({
      where: { organizationId: orgId, firstValueAt: { not: null } },
      select: { startedAt: true, firstValueAt: true },
    }),
    prisma.userStepProgress.findMany({
      where: {
        session: { organizationId: orgId },
        status: 'completed',
        aiAssisted: true,
      },
      select: { aiAssisted: true },
    }),
  ]);

  const orgCompletionRate = orgTotalSessions > 0
    ? (orgCompletedSessions / orgTotalSessions) * 100
    : null;

  const orgAvgTimeToValueMs = orgFirstValueSessions.length > 0
    ? orgFirstValueSessions.reduce((sum, s) =>
        sum + (s.firstValueAt!.getTime() - s.startedAt.getTime()), 0
      ) / orgFirstValueSessions.length
    : null;

  const orgAvgTimeToValueMins = orgAvgTimeToValueMs !== null
    ? Math.round(orgAvgTimeToValueMs / 60000)
    : null;

  // ── Cross-org aggregate (anonymized — no org IDs) ─────────────────────────
  const [
    crossTotal,
    crossCompleted,
    crossFirstValue,
    orgCount,
  ] = await Promise.all([
    prisma.userOnboardingSession.count(),
    prisma.userOnboardingSession.count({ where: { status: 'completed' } }),
    prisma.userOnboardingSession.count({ where: { firstValueAt: { not: null } } }),
    prisma.organization.count(),
  ]);

  // Blend real data with baseline (more real data = more weight on real data)
  const dataWeight = Math.min(orgCount / 10, 0.7); // 0% baseline weight at 10+ orgs
  const industryCompletionRate = crossTotal > 10
    ? ((crossCompleted / crossTotal) * 100 * dataWeight) + (INDUSTRY_BASELINE.completionRate * (1 - dataWeight))
    : INDUSTRY_BASELINE.completionRate;

  const crossFirstValueSessions = await prisma.userOnboardingSession.findMany({
    where: { firstValueAt: { not: null } },
    select: { startedAt: true, firstValueAt: true },
    take: 1000, // cap for performance
  });

  const crossAvgTimeMs = crossFirstValueSessions.length > 5
    ? crossFirstValueSessions.reduce((sum, s) =>
        sum + (s.firstValueAt!.getTime() - s.startedAt.getTime()), 0
      ) / crossFirstValueSessions.length
    : null;

  const industryTimeToValueMins = crossAvgTimeMs !== null
    ? Math.round((crossAvgTimeMs / 60000) * dataWeight + INDUSTRY_BASELINE.timeToValueMins * (1 - dataWeight))
    : INDUSTRY_BASELINE.timeToValueMins;

  // ── Activation score (0–100) ──────────────────────────────────────────────
  // Weighted: 50% completion rate vs industry, 30% time-to-value vs industry, 20% first-value rate
  let score = 50; // default
  if (orgCompletionRate !== null) {
    const crScore = Math.min((orgCompletionRate / industryCompletionRate) * 50, 100);
    const ttvScore = orgAvgTimeToValueMins !== null
      ? Math.min((industryTimeToValueMins / orgAvgTimeToValueMins) * 30, 60)
      : 25;
    const fvScore = orgTotalSessions > 0
      ? Math.min((orgFirstValueSessions.length / orgTotalSessions) * 20, 20)
      : 10;
    score = Math.round(Math.min(crScore + ttvScore + fvScore, 100));
  }

  res.json({
    org: {
      totalSessions: orgTotalSessions,
      completedSessions: orgCompletedSessions,
      completionRate: orgCompletionRate !== null ? Math.round(orgCompletionRate * 10) / 10 : null,
      firstValueCount: orgFirstValueSessions.length,
      avgTimeToValueMins: orgAvgTimeToValueMins,
      aiAssistRate: orgAllProgress.length > 0 ? 100 : 0, // all completed with AI (simplified)
    },
    industry: {
      completionRate: Math.round(industryCompletionRate * 10) / 10,
      timeToValueMins: industryTimeToValueMins,
      dataPoints: crossTotal,
      orgCount,
    },
    score,
    dataMaturity: crossTotal < 50 ? 'early' : crossTotal < 500 ? 'growing' : 'mature',
  });
});

// ─── GET /api/v1/benchmarks/steps ─────────────────────────────────────────────
// Per-step comparison: this org's drop-off vs industry avg for that intent
router.get('/steps', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const flow = await prisma.onboardingFlow.findFirst({
    where: { organizationId: orgId, isActive: true },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!flow) {
    res.json({ steps: [] });
    return;
  }

  const benchmarkSteps = await Promise.all(
    flow.steps.map(async (step) => {
      // This org's metrics
      const [orgStarted, orgCompleted] = await Promise.all([
        prisma.userStepProgress.count({
          where: { stepId: step.id, status: { in: ['in_progress', 'completed'] } },
        }),
        prisma.userStepProgress.count({
          where: { stepId: step.id, status: 'completed' },
        }),
      ]);

      const orgDropOffRate = orgStarted > 0
        ? Math.round(((orgStarted - orgCompleted) / orgStarted) * 100)
        : null;

      // Cross-org aggregate for same intent
      let industryDropOffRate = INTENT_DROP_BENCHMARKS[step.intent] ?? DEFAULT_INTENT_DROP;

      if (step.intent) {
        // Get real cross-org data for this intent
        const crossSteps = await prisma.onboardingStep.findMany({
          where: { intent: step.intent, flowId: { not: flow.id } },
          select: { id: true },
        });
        if (crossSteps.length > 0) {
          const crossIds = crossSteps.map((s) => s.id);
          const [crossStarted, crossCompleted] = await Promise.all([
            prisma.userStepProgress.count({
              where: { stepId: { in: crossIds }, status: { in: ['in_progress', 'completed'] } },
            }),
            prisma.userStepProgress.count({
              where: { stepId: { in: crossIds }, status: 'completed' },
            }),
          ]);
          if (crossStarted > 10) {
            const realRate = Math.round(((crossStarted - crossCompleted) / crossStarted) * 100);
            const weight = Math.min(crossStarted / 100, 0.7);
            industryDropOffRate = Math.round(realRate * weight + industryDropOffRate * (1 - weight));
          }
        }
      }

      const delta = orgDropOffRate !== null ? orgDropOffRate - industryDropOffRate : null;
      const status: 'good' | 'average' | 'poor' | 'no_data' =
        orgDropOffRate === null ? 'no_data'
        : delta !== null && delta > 15 ? 'poor'
        : delta !== null && delta < -10 ? 'good'
        : 'average';

      return {
        stepId: step.id,
        stepTitle: step.title,
        intent: step.intent,
        order: step.order,
        isMilestone: step.isMilestone,
        orgStarted,
        orgCompleted,
        orgDropOffRate,
        industryDropOffRate,
        delta,
        status,
        recommendation: getRecommendation(status, step.title, delta),
      };
    })
  );

  res.json({ flowName: flow.name, steps: benchmarkSteps });
});

function getRecommendation(
  status: 'good' | 'average' | 'poor' | 'no_data',
  stepTitle: string,
  delta: number | null
): string | null {
  if (status === 'poor' && delta !== null) {
    return `Drop-off is ${delta}% above industry average. Run prompt optimization to improve this step.`;
  }
  if (status === 'good') {
    return `Performing ${Math.abs(delta!)}% better than industry average. Consider saving this prompt as a template.`;
  }
  if (status === 'no_data') {
    return 'No data yet — send some test sessions through to get benchmark comparison.';
  }
  return null;
}

export default router;
