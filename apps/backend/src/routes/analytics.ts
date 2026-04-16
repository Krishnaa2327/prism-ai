import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── GET /api/v1/analytics/overview ─────────────────────────────────────────
router.get('/overview', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalConversations,
    conversationsThisWeek,
    totalMessages,
    activeUsers,
    closedConversations,
  ] = await Promise.all([
    prisma.conversation.count({ where: { organizationId } }),
    prisma.conversation.count({
      where: { organizationId, startedAt: { gte: sevenDaysAgo } },
    }),
    prisma.message.count({
      where: { conversation: { organizationId } },
    }),
    prisma.endUser.count({
      where: { organizationId, lastSeenAt: { gte: thirtyDaysAgo } },
    }),
    prisma.conversation.count({
      where: { organizationId, status: 'closed' },
    }),
  ]);

  const avgMessagesPerConv =
    totalConversations > 0
      ? Math.round((totalMessages / totalConversations) * 10) / 10
      : 0;

  const conversionRate =
    totalConversations > 0
      ? Math.round((closedConversations / totalConversations) * 100) / 100
      : 0;

  res.json({
    totalConversations,
    conversationsThisWeek,
    activeUsers,
    avgMessagesPerConv,
    conversionRate,
    periodDays: 30,
  });
});

// ─── GET /api/v1/analytics/timeline?days=30 ──────────────────────────────────
router.get('/timeline', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;
  const days = Math.min(parseInt(req.query.days as string) || 30, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Raw SQL for grouping by date (Prisma doesn't have groupBy date truncation)
  const rows = await prisma.$queryRaw<Array<{ date: Date; conversations: bigint }>>`
    SELECT
      DATE_TRUNC('day', "started_at") AS date,
      COUNT(*)::bigint                AS conversations
    FROM conversations
    WHERE organization_id = ${organizationId}
      AND started_at >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  // Fill in missing days with 0
  const map = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.conversations)]));
  const timeline = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    timeline.push({ date: key, conversations: map.get(key) ?? 0 });
  }

  res.json(timeline);
});

// ─── GET /api/v1/analytics/triggers ──────────────────────────────────────────
// Breakdown of what triggered conversations (idle, exit_intent, manual)
router.get('/triggers', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;

  const rows = await prisma.conversation.groupBy({
    by: ['triggeredBy'],
    where: { organizationId },
    _count: { id: true },
  });

  const data = rows.map((r) => ({
    trigger: r.triggeredBy ?? 'manual',
    count: r._count.id,
  }));

  res.json(data);
});

// ─── GET /api/v1/analytics/intents?days=30 ───────────────────────────────────
// Surfaces what users actually typed in the widget — grouped by normalised text,
// classified by intent category, sorted by frequency.
// Intent categories: how_to | stuck | navigation | question | other
router.get('/intents', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;
  const days = Math.min(parseInt(req.query.days as string) || 30, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch recent user messages in the window — capped at 2000 to avoid OOM on busy orgs
  const messages = await prisma.message.findMany({
    where: {
      role: 'user',
      createdAt: { gte: since },
      conversation: { organizationId },
    },
    select: { content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  // Classify intent from normalised text
  function classifyIntent(text: string): 'how_to' | 'stuck' | 'navigation' | 'question' | 'other' {
    const t = text.toLowerCase();
    if (/\bhow\b/.test(t) || /steps to/.test(t)) return 'how_to';
    if (/can'?t|cannot|error|broken|doesn'?t work|not working|fail|issue|problem|stuck/.test(t)) return 'stuck';
    if (/\bwhere\b|\bfind\b|\bnavigate\b|\bgo to\b|\btake me\b|\bshow me\b/.test(t)) return 'navigation';
    if (/\bwhat\b|\bwhy\b|\bwhich\b|\bexplain\b|\btell me\b|\bdoes\b/.test(t) || t.includes('?')) return 'question';
    return 'other';
  }

  // Normalise: lowercase, collapse whitespace, strip leading punctuation
  function normalise(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120); // cap length so long rambling messages still group
  }

  // Skip internal widget system messages — never expose these in intent analytics
  const SKIP = new Set(['__init__', '__verify__']);

  // Group by normalised content
  const map = new Map<string, { raw: string; count: number; lastSeen: Date; intent: ReturnType<typeof classifyIntent> }>();
  for (const msg of messages) {
    const norm = normalise(msg.content);
    if (!norm || SKIP.has(norm)) continue;
    if (!map.has(norm)) {
      map.set(norm, { raw: msg.content.trim().slice(0, 200), count: 0, lastSeen: msg.createdAt, intent: classifyIntent(norm) });
    }
    const entry = map.get(norm)!;
    entry.count++;
    if (msg.createdAt > entry.lastSeen) entry.lastSeen = msg.createdAt;
  }

  // Sort by count desc, take top 100
  const questions = [...map.entries()]
    .map(([, v]) => v)
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  // Category summary
  const categorySummary: Record<string, number> = { how_to: 0, stuck: 0, navigation: 0, question: 0, other: 0 };
  for (const q of questions) categorySummary[q.intent] += q.count;

  res.json({ questions, categorySummary, totalMessages: messages.length, days });
});

// ─── GET /api/v1/analytics/health ────────────────────────────────────────────
// Agent health: last 10 sessions, 24-h success rate, avg step response time
router.get('/health', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  // Last 10 sessions (any status) ordered by most recent activity
  const recentSessions = await prisma.userOnboardingSession.findMany({
    where: { organizationId },
    orderBy: { lastActiveAt: 'desc' },
    take: 10,
    include: {
      flow: { select: { name: true } },
      endUser: { select: { externalId: true } },
    },
  });

  // 24-h session counts for success rate
  const [total24h, completed24h] = await Promise.all([
    prisma.userOnboardingSession.count({
      where: { organizationId, startedAt: { gte: since24h } },
    }),
    prisma.userOnboardingSession.count({
      where: { organizationId, startedAt: { gte: since24h }, status: 'completed' },
    }),
  ]);

  // Fall back to 7-day window if no 24-h sessions
  const useFallback = total24h === 0;
  const [totalWindow, completedWindow] = useFallback
    ? await Promise.all([
        prisma.userOnboardingSession.count({
          where: { organizationId, startedAt: { gte: since7d } },
        }),
        prisma.userOnboardingSession.count({
          where: { organizationId, startedAt: { gte: since7d }, status: 'completed' },
        }),
      ])
    : [total24h, completed24h];

  const successRate = totalWindow > 0 ? Math.round((completedWindow / totalWindow) * 100) : null;

  // Avg time-spent per completed step (proxy for "AI response time per turn")
  const avgResult = await prisma.userStepProgress.aggregate({
    where: {
      status: 'completed',
      timeSpentMs: { gt: 0 },
      session: { organizationId, startedAt: { gte: useFallback ? since7d : since24h } },
    },
    _avg: { timeSpentMs: true },
  });
  const avgResponseMs = avgResult._avg.timeSpentMs
    ? Math.round(avgResult._avg.timeSpentMs)
    : null;

  // Status signal
  let status: 'green' | 'yellow' | 'red' | 'unknown';
  if (successRate === null) {
    status = 'unknown';
  } else if (successRate >= 60) {
    status = 'green';
  } else if (successRate >= 20) {
    status = 'yellow';
  } else {
    status = 'red';
  }

  res.json({
    status,
    successRate,
    totalSessions: totalWindow,
    completedSessions: completedWindow,
    avgResponseMs,
    windowHours: useFallback ? 168 : 24,
    sessions: recentSessions.map((s) => ({
      id: s.id,
      status: s.status,
      flowName: s.flow.name,
      userId: s.endUser.externalId,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      lastActiveAt: s.lastActiveAt,
    })),
  });
});

export default router;
