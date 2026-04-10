import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateApiKey } from '../lib/apiKey';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const AIConfigSchema = z.object({
  customInstructions: z.string().max(2000).optional(),
});

// ─── PUT /api/v1/config/ai ───────────────────────────────────────────────────
router.put('/ai', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;
  const body = AIConfigSchema.parse(req.body);

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { customInstructions: body.customInstructions ?? null },
    select: { id: true, customInstructions: true },
  });

  res.json({ updated: true, customInstructions: org.customInstructions });
});

// ─── GET /api/v1/config ──────────────────────────────────────────────────────
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId } = req.user!;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, apiKey: true, planType: true, customInstructions: true },
  });

  res.json(org);
});

// ─── POST /api/v1/config/rotate-key ─────────────────────────────────────────
// Generates a new API key (old one stops working immediately)
router.post('/rotate-key', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId, role } = req.user!;

  if (role !== 'owner' && role !== 'admin') {
    res.status(403).json({ error: 'Only owners and admins can rotate API keys' });
    return;
  }

  const newKey = generateApiKey();
  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { apiKey: newKey },
    select: { apiKey: true },
  });

  res.json({ apiKey: org.apiKey });
});

export default router;
