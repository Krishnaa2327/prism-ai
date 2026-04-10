import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateApiKey, authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const CreateConversationSchema = z.object({
  endUserId: z.string().min(1),
  metadata: z.record(z.unknown()).optional().default({}),
  triggeredBy: z.enum(['idle', 'exit_intent', 'manual']).optional(),
});

// ─── POST /api/v1/conversations  (widget) ───────────────────────────────────
// Called by the JS widget when a drop-off moment is detected
router.post(
  '/',
  authenticateApiKey,
  async (req: AuthenticatedRequest, res: Response) => {
    const body = CreateConversationSchema.parse(req.body);
    const org = req.organization!;

    // Upsert the end user (create if not seen before)
    const endUser = await prisma.endUser.upsert({
      where: {
        organizationId_externalId: {
          organizationId: org.id,
          externalId: body.endUserId,
        },
      },
      update: {
        lastSeenAt: new Date(),
        metadata: body.metadata as object,
      },
      create: {
        organizationId: org.id,
        externalId: body.endUserId,
        metadata: body.metadata as object,
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        endUserId: endUser.id,
        organizationId: org.id,
        triggeredBy: body.triggeredBy ?? 'manual',
      },
    });

    res.status(201).json({
      conversationId: conversation.id,
      status: conversation.status,
    });
  }
);

// ─── GET /api/v1/conversations  (dashboard) ──────────────────────────────────
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.user!;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { organizationId },
        include: {
          endUser: { select: { id: true, externalId: true, metadata: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.conversation.count({ where: { organizationId } }),
    ]);

    res.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        triggeredBy: c.triggeredBy,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        messageCount: c._count.messages,
        endUser: c.endUser,
      })),
      total,
      hasMore: offset + limit < total,
    });
  }
);

// ─── GET /api/v1/conversations/:id  (dashboard) ──────────────────────────────
router.get(
  '/:id',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.user!;

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, organizationId },
      include: {
        endUser: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json(conversation);
  }
);

export default router;
