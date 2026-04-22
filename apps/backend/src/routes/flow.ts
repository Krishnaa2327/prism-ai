import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { checkAgentLimit } from '../middleware/rateLimit';
import { AuthenticatedRequest } from '../types';
import { FLOW_TEMPLATES } from '../lib/templates';
import { broadcastToOrgWidgets } from '../lib/websocket';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/flow/templates — list built-in vertical templates ────────────
router.get('/templates', (_req, res) => {
  // Strip step details to keep response small — dashboard only needs metadata for the picker
  const list = FLOW_TEMPLATES.map(({ steps, ...meta }) => ({
    ...meta,
    stepCount: steps.length,
  }));
  res.json({ templates: list });
});

// ─── POST /api/v1/flow/from-template — create a flow from a template ──────────
router.post('/from-template', async (req: AuthenticatedRequest, res: Response) => {
  const { templateId } = req.body as { templateId: string };
  const template = FLOW_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const orgId = req.user!.organizationId;

  const limitErr = await checkAgentLimit(orgId);
  if (limitErr) {
    res.status(403).json({ error: limitErr, code: 'AGENT_LIMIT_REACHED' });
    return;
  }

  const flow = await prisma.onboardingFlow.create({
    data: {
      organizationId: orgId,
      name: template.name,
      description: template.description,
      isActive: true,
      steps: {
        create: template.steps.map((s) => ({
          order: s.order,
          title: s.title,
          intent: s.intent,
          description: s.description,
          aiPrompt: s.aiPrompt,
          smartQuestions: s.smartQuestions,
          actionType: s.actionType,
          actionConfig: s.actionConfig as Prisma.InputJsonValue,
          completionEvent: s.completionEvent,
          isMilestone: s.isMilestone,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  res.status(201).json({ flow });
});

// ─── GET /api/v1/flow — list all flows for the org ───────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const flows = await prisma.onboardingFlow.findMany({
    where: { organizationId: req.user!.organizationId },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ flows });
});

// ─── GET /api/v1/flow/:id — single flow with steps ───────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const flow = await prisma.onboardingFlow.findFirstOrThrow({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  res.json({ flow });
});

// ─── POST /api/v1/flow — create flow ─────────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body as { name: string; description?: string };

  const limitErr = await checkAgentLimit(req.user!.organizationId);
  if (limitErr) {
    res.status(403).json({ error: limitErr, code: 'AGENT_LIMIT_REACHED' });
    return;
  }

  const flow = await prisma.onboardingFlow.create({
    data: { organizationId: req.user!.organizationId, name, description: description ?? '' },
    include: { steps: true },
  });
  res.status(201).json({ flow });
});

// ─── PUT /api/v1/flow/:id — update flow ──────────────────────────────────────
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isActive, triggerDelayMs, urlPattern, maxTriggersPerUser, targetRoles } = req.body as {
    name?: string;
    description?: string;
    isActive?: boolean;
    triggerDelayMs?: number;
    urlPattern?: string;
    maxTriggersPerUser?: number;
    targetRoles?: string[];
  };
  const flow = await prisma.onboardingFlow.updateMany({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      ...(triggerDelayMs !== undefined && { triggerDelayMs }),
      ...(urlPattern !== undefined && { urlPattern }),
      ...(maxTriggersPerUser !== undefined && { maxTriggersPerUser }),
      ...(targetRoles !== undefined && { targetRoles }),
    },
  });
  if (flow.count > 0) {
    broadcastToOrgWidgets(req.user!.organizationId, { type: 'flow_updated', flowId: req.params.id });
  }
  res.json({ updated: flow.count > 0 });
});

// ─── DELETE /api/v1/flow/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  // Block deletion if users are actively mid-flow — mark inactive first
  const activeSessions = await prisma.userOnboardingSession.count({
    where: { flowId: req.params.id, organizationId: orgId, status: 'active' },
  });

  if (activeSessions > 0) {
    res.status(409).json({
      error: `Cannot delete: ${activeSessions} active session(s) in progress. Deactivate the flow first, then delete once sessions have completed or timed out.`,
      activeSessions,
    });
    return;
  }

  await prisma.onboardingFlow.deleteMany({
    where: { id: req.params.id, organizationId: orgId },
  });
  res.json({ deleted: true });
});

// ─── POST /api/v1/flow/:id/steps — add step ──────────────────────────────────
router.post('/:id/steps', async (req: AuthenticatedRequest, res: Response) => {
  // verify flow belongs to org
  const flow = await prisma.onboardingFlow.findFirstOrThrow({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    include: { steps: { select: { order: true } } },
  });

  const maxOrder = flow.steps.length > 0 ? Math.max(...flow.steps.map((s) => s.order)) : -1;

  const {
    title,
    intent,
    description,
    aiPrompt,
    smartQuestions,
    actionType,
    actionConfig,
    completionEvent,
    isMilestone,
  } = req.body as {
    title: string;
    intent?: string;
    description?: string;
    aiPrompt?: string;
    smartQuestions?: string[];
    actionType?: string;
    actionConfig?: Record<string, unknown>;
    completionEvent?: string;
    isMilestone?: boolean;
  };

  const step = await prisma.onboardingStep.create({
    data: {
      flowId: req.params.id,
      order: maxOrder + 1,
      title,
      intent: intent ?? '',
      description: description ?? '',
      aiPrompt: aiPrompt ?? '',
      smartQuestions: smartQuestions ?? [],
      actionType: actionType ?? null,
      actionConfig: (actionConfig ?? {}) as Prisma.InputJsonValue,
      completionEvent: completionEvent ?? null,
      isMilestone: isMilestone ?? false,
    },
  });
  res.status(201).json({ step });
});

// ─── PUT /api/v1/flow/:id/steps/:stepId — update step ────────────────────────
router.put('/:id/steps/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  // verify ownership
  await prisma.onboardingFlow.findFirstOrThrow({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });

  const {
    title,
    intent,
    description,
    aiPrompt,
    smartQuestions,
    actionType,
    actionConfig,
    completionEvent,
    isMilestone,
    order,
  } = req.body as Record<string, unknown>;

  const step = await prisma.onboardingStep.update({
    where: { id: req.params.stepId, flowId: req.params.id },
    data: {
      ...(title !== undefined && { title: title as string }),
      ...(intent !== undefined && { intent: intent as string }),
      ...(description !== undefined && { description: description as string }),
      ...(aiPrompt !== undefined && { aiPrompt: aiPrompt as string }),
      ...(smartQuestions !== undefined && { smartQuestions: smartQuestions as Prisma.InputJsonValue }),
      ...(actionType !== undefined && { actionType: actionType as string | null }),
      ...(actionConfig !== undefined && { actionConfig: actionConfig as Prisma.InputJsonValue }),
      ...(completionEvent !== undefined && { completionEvent: completionEvent as string | null }),
      ...(isMilestone !== undefined && { isMilestone: isMilestone as boolean }),
      ...(order !== undefined && { order: order as number }),
    },
  });
  res.json({ step });
});

// ─── DELETE /api/v1/flow/:id/steps/:stepId ────────────────────────────────────
router.delete('/:id/steps/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  await prisma.onboardingFlow.findFirstOrThrow({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });
  await prisma.onboardingStep.delete({ where: { id: req.params.stepId, flowId: req.params.id } });
  res.json({ deleted: true });
});

export default router;
