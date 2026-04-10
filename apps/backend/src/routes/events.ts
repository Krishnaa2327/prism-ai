import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateApiKey } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { triggerFollowUp } from '../lib/followup';

const router = Router();

const EventSchema = z.object({
  endUserId: z.string().min(1),
  eventType: z.enum([
    'page_view', 'idle', 'exit_intent', 'click',
    'form_start', 'form_abandon', 'rage_click', 'scroll_depth', 'custom',
  ]),
  properties: z.record(z.unknown()).optional().default({}),
});

// Drop-off event types that should trigger follow-up
const DROP_OFF_EVENTS = new Set(['exit_intent', 'rage_click', 'form_abandon']);

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

  // ─── Follow-up trigger (fire-and-forget) ─────────────────────────────────
  // On drop-off events, check if org has follow-up configured and fire it.
  if (DROP_OFF_EVENTS.has(body.eventType)) {
    prisma.followUpConfig
      .findUnique({ where: { organizationId: org.id } })
      .then((config) => {
        if (!config) return;

        const props = body.properties as Record<string, string>;
        const userEmail = props.email ?? (endUser.metadata as Record<string, string>)?.email;
        const userPhone = props.phone ?? (endUser.metadata as Record<string, string>)?.phone;

        const slackMessage = [
          `⚠️ Drop-off detected on *${org.name}*`,
          `Event: \`${body.eventType}\``,
          `User: \`${body.endUserId}\``,
          `Page: ${props.page ?? 'unknown'}`,
        ].join('\n');

        return triggerFollowUp({
          config,
          orgName: org.name,
          userEmail,
          userPhone,
          slackMessage,
        });
      })
      .catch((e) => console.error('[events] follow-up trigger failed:', e));
  }

  res.status(201).json({ eventId: event.id });
});

export default router;
