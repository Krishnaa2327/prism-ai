import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateJWT, authenticateApiKey } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const StepSchema = z.object({
  label: z.string().min(1).max(120),
  description: z.string().max(300).default(''),
  order: z.number().int().default(0),
  completionEvent: z.string().optional(),
  isRequired: z.boolean().default(true),
});

// ─── GET /api/v1/checklist ────────────────────────────────────────────────────
// Called by the widget (API key auth) to render the checklist for end users
router.get('/', authenticateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organization!.id;

  const steps = await prisma.checklistStep.findMany({
    where: { organizationId: orgId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      label: true,
      description: true,
      order: true,
      completionEvent: true,
      isRequired: true,
    },
  });

  res.json({ steps });
});

// ─── GET /api/v1/checklist/admin ──────────────────────────────────────────────
// Dashboard — list all steps for management
router.get('/admin', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const steps = await prisma.checklistStep.findMany({
    where: { organizationId: orgId },
    orderBy: { order: 'asc' },
  });

  res.json({ steps });
});

// ─── POST /api/v1/checklist/steps ─────────────────────────────────────────────
router.post('/steps', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const body = StepSchema.parse(req.body);

  const step = await prisma.checklistStep.create({
    data: { organizationId: orgId, ...body },
  });

  res.status(201).json({ step });
});

// ─── PUT /api/v1/checklist/steps/:id ─────────────────────────────────────────
router.put('/steps/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const body = StepSchema.partial().parse(req.body);

  // Ensure step belongs to this org
  const existing = await prisma.checklistStep.findFirst({
    where: { id: req.params.id, organizationId: orgId },
  });
  if (!existing) { res.status(404).json({ error: 'Step not found' }); return; }

  const step = await prisma.checklistStep.update({
    where: { id: req.params.id },
    data: body,
  });

  res.json({ step });
});

// ─── DELETE /api/v1/checklist/steps/:id ──────────────────────────────────────
router.delete('/steps/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const existing = await prisma.checklistStep.findFirst({
    where: { id: req.params.id, organizationId: orgId },
  });
  if (!existing) { res.status(404).json({ error: 'Step not found' }); return; }

  await prisma.checklistStep.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

// ─── POST /api/v1/checklist/steps/reorder ─────────────────────────────────────
// Accepts [{id, order}] array to bulk-update step ordering
router.post('/steps/reorder', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;
  const items = z.array(z.object({ id: z.string(), order: z.number().int() })).parse(req.body);

  await prisma.$transaction(
    items.map(({ id, order }) =>
      prisma.checklistStep.updateMany({
        where: { id, organizationId: orgId },
        data: { order },
      })
    )
  );

  res.json({ updated: items.length });
});

export default router;
