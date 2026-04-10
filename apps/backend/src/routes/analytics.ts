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

  // Fetch all user messages in the window (content + timestamp)
  const messages = await prisma.message.findMany({
    where: {
      role: 'user',
      createdAt: { gte: since },
      conversation: { organizationId },
    },
    select: { content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
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

  // Skip system init tokens used by the widget internally
  const SKIP = new Set(['__init__']);

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

export default router;
