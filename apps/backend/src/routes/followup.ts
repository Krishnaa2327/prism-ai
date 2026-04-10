import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const ConfigSchema = z.object({
  emailEnabled:       z.boolean().optional(),
  slackWebhookUrl:    z.string().url().nullable().optional(),
  whatsappEnabled:    z.boolean().optional(),
  twilioAccountSid:   z.string().nullable().optional(),
  twilioAuthToken:    z.string().nullable().optional(),
  twilioFromNumber:   z.string().nullable().optional(),
  followUpDelayMins:  z.number().int().min(1).max(10080).optional(), // 1 min → 7 days
  emailSubject:       z.string().min(1).max(200).optional(),
  emailBody:          z.string().min(1).max(1000).optional(),
});

// ─── GET /api/v1/followup/config ──────────────────────────────────────────────
router.get('/config', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const config = await prisma.followUpConfig.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId },
    update: {},
  });

  // Never expose Twilio auth token in the response
  res.json({
    emailEnabled:      config.emailEnabled,
    slackWebhookUrl:   config.slackWebhookUrl,
    whatsappEnabled:   config.whatsappEnabled,
    twilioAccountSid:  config.twilioAccountSid,
    twilioAuthToken:   config.twilioAuthToken ? '••••••••' : null,
    twilioFromNumber:  config.twilioFromNumber,
    followUpDelayMins: config.followUpDelayMins,
    emailSubject:      config.emailSubject,
    emailBody:         config.emailBody,
  });
});

// ─── PUT /api/v1/followup/config ──────────────────────────────────────────────
router.put('/config', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const body = ConfigSchema.parse(req.body);

  // If authToken is the masked value, don't overwrite the real one
  const data: typeof body = { ...body };
  if (data.twilioAuthToken === '••••••••') delete data.twilioAuthToken;

  await prisma.followUpConfig.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, ...data },
    update: data,
  });

  res.json({ saved: true });
});

export default router;
