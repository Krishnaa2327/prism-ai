import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateApiKey } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const EventSchema = z.object({
  endUserId: z.string().min(1),
  eventType: z.enum([
    'page_view', 'idle', 'exit_intent', 'click',
    'form_start', 'form_abandon', 'rage_click', 'scroll_depth', 'custom',
  ]),
  properties: z.record(z.unknown()).optional().default({}),
});

// ─── POST /api/v1/events  (widget) ───────────────────────────────────────────
router.post('/', authenticateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  const body = EventSchema.parse(req.body);
  const org = req.organization!;

  const endUser = await prisma.endUser.upsert({
    where: {
      organizationId_externalId: {
        organizationId: org.id,
        externalId: body.endUserId,
      },
    },
    update: { lastSeenAt: new Date() },
    create: {
      organizationId: org.id,
      externalId: body.endUserId,
    },
  });

  const event = await prisma.event.create({
    data: {
      endUserId: endUser.id,
      organizationId: org.id,
      eventType: body.eventType,
      properties: body.properties as object,
    },
  });

  res.status(201).json({ eventId: event.id });
});

export default router;
