import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateApiKey } from '../middleware/auth';
import { enforceMessageLimit } from '../middleware/rateLimit';
import { AuthenticatedRequest } from '../types';
import { handleMessage } from '../services/ai';

const router = Router();

const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

// ─── POST /api/v1/messages  (widget) ─────────────────────────────────────────
// The widget sends user messages here and gets AI responses back
router.post(
  '/',
  authenticateApiKey,
  enforceMessageLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    const body = SendMessageSchema.parse(req.body);
    const org = req.organization!;

    // Verify conversation belongs to this org
    const conversation = await prisma.conversation.findFirst({
      where: { id: body.conversationId, organizationId: org.id },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    if (conversation.status === 'closed') {
      res.status(400).json({ error: 'Conversation is closed' });
      return;
    }

    // Send to AI service — saves both messages to DB, returns assistant reply
    const response = await handleMessage(body.conversationId, body.content);

    res.json({
      messageId: response.messageId,
      role: 'assistant',
      content: response.content,
      tokensUsed: response.tokensUsed,
    });
  }
);

export default router;
