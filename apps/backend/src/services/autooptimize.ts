/**
 * Auto-optimization service — Phase 4
 *
 * Scans the active onboarding flow, finds underperforming steps,
 * calls Claude to suggest improvements, and applies them automatically.
 * Every run is logged to OptimizationLog.
 */

import OpenAI from 'openai';
import { prisma } from '../lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AutoOptimizeResult {
  stepsScanned: number;
  stepsOptimized: number;
  stepsSkipped: number; // not enough data or above threshold
  optimized: Array<{
    stepId: string;
    stepTitle: string;
    completionRateBefore: number;
    previousPrompt: string | null;
    newPrompt: string;
    reason: string;
  }>;
}

export async function runAutoOptimization(orgId: string, triggeredBy: 'auto' | 'manual'): Promise<AutoOptimizeResult> {
  // ── Load config ───────────────────────────────────────────────────────────
  const config = await prisma.autoOptimizeConfig.findUnique({
    where: { organizationId: orgId },
  });
  const threshold = config?.threshold ?? 50;
  const minSessions = config?.minSessions ?? 10;

  // ── Load active flow ──────────────────────────────────────────────────────
  const flow = await prisma.onboardingFlow.findFirst({
    where: { organizationId: orgId, isActive: true },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!flow) {
    return { stepsScanned: 0, stepsOptimized: 0, stepsSkipped: 0, optimized: [] };
  }

  const result: AutoOptimizeResult = {
    stepsScanned: flow.steps.length,
    stepsOptimized: 0,
    stepsSkipped: 0,
    optimized: [],
  };

  for (const step of flow.steps) {
    // ── Check performance data ────────────────────────────────────────────
    const progress = await prisma.userStepProgress.findMany({
      where: { stepId: step.id },
      select: { status: true, messagesCount: true, outcome: true, dropReason: true },
    });

    const total = progress.length;
    if (total < minSessions) {
      result.stepsSkipped++;
      continue;
    }

    const completed = progress.filter((p) => p.status === 'completed').length;
    const completionRate = Math.round((completed / total) * 100);

    if (completionRate >= threshold) {
      result.stepsSkipped++;
      continue;
    }

    // ── This step qualifies — ask Claude for improvement ──────────────────
    const avgMessages = completed > 0
      ? progress.filter((p) => p.messagesCount > 0)
          .reduce((s, p, _, arr) => s + p.messagesCount / arr.length, 0)
      : 0;

    const dropReasons = progress
      .filter((p) => p.dropReason)
      .map((p) => p.dropReason)
      .slice(0, 5)
      .join(', ') || 'none recorded';

    const prompt = `You are an expert at optimizing AI onboarding prompts for SaaS products.

A specific onboarding step is underperforming. Rewrite its AI prompt to improve completion rate.

Step: "${step.title}"
Intent: "${step.intent || 'general'}"
Current prompt: ${step.aiPrompt || '(none — using default behavior)'}

Performance (${total} sessions):
- Completion rate: ${completionRate}% (threshold: ${threshold}%)
- Avg messages to complete: ${avgMessages.toFixed(1)}
- Drop reasons: ${dropReasons}

Write an improved prompt (2–4 direct sentences). Return ONLY a JSON object:
{
  "newPrompt": "<improved prompt>",
  "reason": "<one sentence: what was wrong and how you fixed it>"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // cheaper model for batch runs
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0].message.content ?? '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    let parsed: { newPrompt?: string; reason?: string } = {};
    try {
      parsed = JSON.parse(jsonMatch?.[0] ?? '{}');
    } catch {
      result.stepsSkipped++;
      continue;
    }

    if (!parsed.newPrompt) {
      result.stepsSkipped++;
      continue;
    }

    // ── Apply the new prompt ──────────────────────────────────────────────
    await prisma.onboardingStep.update({
      where: { id: step.id },
      data: { aiPrompt: parsed.newPrompt.trim() },
    });

    // ── Log the optimization ──────────────────────────────────────────────
    await prisma.optimizationLog.create({
      data: {
        organizationId: orgId,
        stepId: step.id,
        flowId: flow.id,
        triggeredBy,
        previousPrompt: step.aiPrompt || null,
        newPrompt: parsed.newPrompt.trim(),
        completionRateBefore: completionRate,
        reason: parsed.reason ?? `Completion rate was ${completionRate}% (threshold: ${threshold}%)`,
      },
    });

    result.stepsOptimized++;
    result.optimized.push({
      stepId: step.id,
      stepTitle: step.title,
      completionRateBefore: completionRate,
      previousPrompt: step.aiPrompt || null,
      newPrompt: parsed.newPrompt.trim(),
      reason: parsed.reason ?? '',
    });
  }

  // Update last run timestamp
  await prisma.autoOptimizeConfig.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      enabled: triggeredBy === 'auto',
      lastRunAt: new Date(),
    },
    update: { lastRunAt: new Date() },
  });

  return result;
}
