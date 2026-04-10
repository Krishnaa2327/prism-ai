/**
 * AI Prompt Optimizer — Phase 3 moat
 *
 * Analyzes per-step performance data from the intelligence pipeline and uses
 * Claude to suggest improvements to underperforming AI prompts.
 */

import { Router, Response } from 'express';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── GET /api/v1/optimize/flow ────────────────────────────────────────────────
// Per-step health scores and performance data for the active flow
router.get('/flow', async (req: AuthenticatedRequest, res: Response) => {
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

  const steps = await Promise.all(
    flow.steps.map(async (step) => {
      const progress = await prisma.userStepProgress.findMany({
        where: { stepId: step.id },
        select: {
          status: true,
          messagesCount: true,
          timeSpentMs: true,
          outcome: true,
          dropReason: true,
          promptSnapshot: true,
        },
      });

      const total = progress.length;
      const completed = progress.filter((p) => p.status === 'completed').length;
      const dropped = progress.filter((p) => p.status === 'not_started' || p.outcome === 'dropped').length;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : null;

      const completedRows = progress.filter(
        (p) => p.status === 'completed' && p.messagesCount > 0
      );
      const avgMessages = completedRows.length > 0
        ? Math.round(completedRows.reduce((s, p) => s + p.messagesCount, 0) / completedRows.length * 10) / 10
        : null;

      const timings = progress.filter((p) => p.status === 'completed' && p.timeSpentMs > 0);
      const avgTimeSecs = timings.length > 0
        ? Math.round(timings.reduce((s, p) => s + p.timeSpentMs, 0) / timings.length / 1000)
        : null;

      // drop reason breakdown
      const dropReasons: Record<string, number> = {};
      for (const p of progress) {
        if (p.dropReason) {
          dropReasons[p.dropReason] = (dropReasons[p.dropReason] ?? 0) + 1;
        }
      }

      // health score: 0-100
      // 60% weight on completion rate (target: >70%)
      // 25% weight on avg messages (target: <4 messages)
      // 15% weight on having a prompt at all
      let health = 50;
      if (completionRate !== null) {
        const crScore = Math.min((completionRate / 70) * 60, 60);
        const msgScore = avgMessages !== null ? Math.max(0, 25 - (avgMessages - 2) * 5) : 12;
        const promptScore = step.aiPrompt ? 15 : 0;
        health = Math.round(Math.min(crScore + msgScore + promptScore, 100));
      }

      // get the most recent prompt snapshot for reference
      const latestSnapshot = progress
        .filter((p) => p.promptSnapshot)
        .slice(-1)[0]?.promptSnapshot ?? step.aiPrompt ?? null;

      return {
        stepId: step.id,
        stepTitle: step.title,
        intent: step.intent,
        order: step.order,
        isMilestone: step.isMilestone,
        currentPrompt: step.aiPrompt || null,
        latestSnapshot,
        stats: {
          total,
          completed,
          dropped,
          completionRate,
          avgMessages,
          avgTimeSecs,
          dropReasons,
        },
        health,
        needsOptimization: health < 60 && total >= 3,
      };
    })
  );

  res.json({ flowId: flow.id, flowName: flow.name, steps });
});

// ─── POST /api/v1/optimize/suggest/:stepId ────────────────────────────────────
// Ask Claude to analyze this step's performance and suggest a better prompt
router.post('/suggest/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const { stepId } = req.params;

  // Verify step belongs to this org
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, flow: { organizationId: orgId } },
    include: { flow: true },
  });

  if (!step) {
    res.status(404).json({ error: 'Step not found' });
    return;
  }

  // Load performance data
  const progress = await prisma.userStepProgress.findMany({
    where: { stepId },
    select: {
      status: true,
      messagesCount: true,
      timeSpentMs: true,
      outcome: true,
      dropReason: true,
      promptSnapshot: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 100,
  });

  const total = progress.length;
  const completed = progress.filter((p) => p.status === 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgMessages = completed > 0
    ? progress.filter((p) => p.status === 'completed' && p.messagesCount > 0)
        .reduce((s, p, _, arr) => s + p.messagesCount / arr.length, 0)
    : 0;

  const dropReasons = progress
    .filter((p) => p.dropReason)
    .map((p) => p.dropReason)
    .slice(0, 5);

  // Collect recent prompt snapshots for context
  const recentSnapshots = [...new Set(
    progress.filter((p) => p.promptSnapshot).map((p) => p.promptSnapshot!)
  )].slice(0, 3);

  const analysisPrompt = `You are an expert at optimizing AI onboarding prompts for SaaS products.

Analyze this onboarding step and suggest an improved AI prompt.

## Step Details
- Title: "${step.title}"
- Intent: "${step.intent || 'general'}"
- Flow: "${step.flow.name}"
- Is milestone step: ${step.isMilestone}

## Current AI Prompt
${step.aiPrompt || '(no custom prompt — using default behavior)'}

## Performance Data (last ${total} sessions)
- Completion rate: ${completionRate}% (target: >70%)
- Avg messages to complete: ${avgMessages.toFixed(1)} (target: <4)
- Drop reasons: ${dropReasons.length > 0 ? dropReasons.join(', ') : 'none recorded'}

## Recent prompt snapshots used at completion
${recentSnapshots.length > 0 ? recentSnapshots.map((s, i) => `Version ${i + 1}: ${s}`).join('\n\n') : '(none available)'}

## Task
Write an improved AI prompt for this step that will:
1. Increase completion rate (currently ${completionRate}%)
2. Reduce back-and-forth (currently ${avgMessages.toFixed(1)} messages avg)
3. Be more action-oriented — tell the AI to DO things, not just explain
4. Address the root causes of drop-off

Return ONLY a JSON object with this exact structure:
{
  "suggestedPrompt": "<the improved prompt — 2-4 sentences, direct instructions>",
  "changes": ["<change 1>", "<change 2>", "<change 3>"],
  "expectedImpact": "<one sentence prediction of improvement>",
  "reasoning": "<2-3 sentences explaining why this will perform better>"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [{ role: 'user', content: analysisPrompt }],
  });

  const raw = response.choices[0].message.content ?? '{}';

  // Extract JSON from response (Claude sometimes wraps in markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  let result: {
    suggestedPrompt: string;
    changes: string[];
    expectedImpact: string;
    reasoning: string;
  };

  try {
    result = JSON.parse(jsonMatch?.[0] ?? '{}');
  } catch {
    res.status(500).json({ error: 'Failed to parse optimization suggestion' });
    return;
  }

  res.json({
    stepId,
    stepTitle: step.title,
    currentPrompt: step.aiPrompt || null,
    ...result,
    stats: { total, completed, completionRate, avgMessages: Math.round(avgMessages * 10) / 10 },
  });
});

// ─── POST /api/v1/optimize/apply/:stepId ─────────────────────────────────────
// Apply the suggested prompt to the step
router.post('/apply/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const { stepId } = req.params;
  const { prompt } = req.body as { prompt: string };

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt string required' });
    return;
  }

  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, flow: { organizationId: orgId } },
    select: { id: true },
  });

  if (!step) {
    res.status(404).json({ error: 'Step not found' });
    return;
  }

  await prisma.onboardingStep.update({
    where: { id: stepId },
    data: { aiPrompt: prompt.trim() },
  });

  res.json({ applied: true, stepId });
});

export default router;
