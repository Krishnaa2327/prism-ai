// ─── User History Service ─────────────────────────────────────────────────────
// Builds a compact history summary for an end user across all their sessions.
// Used to give the AI agent returning-user context without loading raw DB rows.

import { prisma } from '../lib/prisma';

export interface UserHistorySummary {
  isReturning: boolean;
  firstSeenDaysAgo: number;
  totalSessions: number;            // excluding current
  completedSessions: number;
  mergedCollectedData: Record<string, unknown>; // answers from all past sessions merged
  recentSessions: Array<{
    flowName: string;
    status: string;
    stepsCompleted: number;
    totalSteps: number;
    completedAt: string | null;
    lastActiveAt: string;
  }>;
  /** Ready-to-inject section for the agent system prompt. Empty string if no history. */
  formatted: string;
}

export async function getUserHistory(
  endUserId: string,
  currentSessionId: string,
): Promise<UserHistorySummary> {
  const [endUser, pastSessions] = await Promise.all([
    prisma.endUser.findUnique({
      where: { id: endUserId },
      select: { firstSeenAt: true },
    }),
    prisma.userOnboardingSession.findMany({
      where: { endUserId, NOT: { id: currentSessionId } },
      include: {
        flow: { select: { name: true, steps: { select: { id: true }, orderBy: { order: 'asc' } } } },
        stepProgress: { where: { status: 'completed' }, select: { stepId: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!endUser || pastSessions.length === 0) {
    return {
      isReturning: false,
      firstSeenDaysAgo: 0,
      totalSessions: 0,
      completedSessions: 0,
      mergedCollectedData: {},
      recentSessions: [],
      formatted: '',
    };
  }

  const firstSeenDaysAgo = Math.floor(
    (Date.now() - endUser.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Merge collected data from all past sessions (earlier sessions take lower priority)
  const mergedCollectedData: Record<string, unknown> = {};
  for (const s of [...pastSessions].reverse()) {
    Object.assign(mergedCollectedData, s.collectedData as Record<string, unknown>);
  }

  const recentSessions = pastSessions.slice(0, 5).map((s) => ({
    flowName: s.flow.name,
    status: s.status,
    stepsCompleted: s.stepProgress.length,
    totalSteps: s.flow.steps.length,
    completedAt: s.completedAt?.toISOString() ?? null,
    lastActiveAt: s.lastActiveAt.toISOString(),
  }));

  const completedSessions = pastSessions.filter((s) => s.status === 'completed').length;

  // Build compact summary for the system prompt
  const dayWord = firstSeenDaysAgo === 1 ? 'day' : 'days';
  const lines: string[] = [
    `RETURNING USER — first seen ${firstSeenDaysAgo} ${dayWord} ago, ${pastSessions.length} prior session(s), ${completedSessions} completed.`,
  ];

  if (Object.keys(mergedCollectedData).length > 0) {
    lines.push(`Previously provided: ${JSON.stringify(mergedCollectedData)}`);
  }

  for (const s of recentSessions.slice(0, 3)) {
    const progress = `${s.stepsCompleted}/${s.totalSteps} steps`;
    const when = s.completedAt
      ? `completed ${daysAgo(s.completedAt)}`
      : `last active ${daysAgo(s.lastActiveAt)}`;
    lines.push(`  • "${s.flowName}" — ${s.status} (${progress}, ${when})`);
  }

  lines.push('Use previously provided data to avoid re-asking questions. Reference their history naturally.');

  return {
    isReturning: true,
    firstSeenDaysAgo,
    totalSessions: pastSessions.length,
    completedSessions,
    mergedCollectedData,
    recentSessions,
    formatted: lines.join('\n'),
  };
}

function daysAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
