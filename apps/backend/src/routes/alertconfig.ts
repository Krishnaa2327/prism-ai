// ─── Alert configuration ──────────────────────────────────────────────────────
// GET  /api/v1/config/alerts   — fetch current alert settings
// PUT  /api/v1/config/alerts   — update alert settings

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const UpdateSchema = z.object({
  selectorAlertEnabled: z.boolean().optional(),
  selectorAlertWebhook: z.string().url().nullable().optional(),
});

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: { selectorAlertEnabled: true, selectorAlertWebhook: true },
  });
  res.json(org ?? { selectorAlertEnabled: false, selectorAlertWebhook: null });
});

router.put('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const body = UpdateSchema.parse(req.body);
  await prisma.organization.update({
    where: { id: req.user!.organizationId },
    data: body,
  });
  res.json({ saved: true });
});

export default router;
