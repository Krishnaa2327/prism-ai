import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateApiKey } from '../middleware/auth';
import { runAgent } from '../services/agent';
import { detectIntent } from '../services/intent';
import { fireIntegrationEvents } from '../services/integrations';
import { getUserHistory } from '../services/userhistory';
import { createEscalationTicket, notifyTeam } from '../services/escalation';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateApiKey);

// ─── Helper: get or create end user ──────────────────────────────────────────
async function getOrCreateEndUser(orgId: string, userId: string, metadata: Record<string, unknown>) {
  return prisma.endUser.upsert({
    where: { organizationId_externalId: { organizationId: orgId, externalId: userId } },
    create: {
      organizationId: orgId,
      externalId: userId,
      metadata,
      lastSeenAt: new Date(),
    },
    update: { metadata, lastSeenAt: new Date() },
  });
}

// ─── GET /api/v1/session?userId=&flowId= ─────────────────────────────────────
// Returns the user's current onboarding session + current step info
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { userId, flowId } = req.query as { userId: string; flowId?: string };

  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  const endUser = await prisma.endUser.findUnique({
    where: {
      organizationId_externalId: {
        organizationId: req.organization!.id,
        externalId: userId,
      },
    },
  });

  if (!endUser) {
    res.json({ session: null });
    return;
  }

  // find session — prefer the specified flow, otherwise find the active one
  const session = await prisma.userOnboardingSession.findFirst({
    where: {
      endUserId: endUser.id,
      organizationId: req.organization!.id,
      ...(flowId ? { flowId } : {}),
      status: 'active',
    },
    include: {
      flow: { include: { steps: { orderBy: { order: 'asc' } } } },
      stepProgress: true,
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  if (!session) {
    res.json({ session: null });
    return;
  }

  const currentStep = session.flow.steps.find((s) => s.id === session.currentStepId) ?? session.flow.steps[0];
  const completedStepIds = session.stepProgress
    .filter((p) => p.status === 'completed')
    .map((p) => p.stepId);

  res.json({
    session: {
      id: session.id,
      status: session.status,
      firstValueAt: session.firstValueAt,
      currentStep,
      completedStepIds,
      totalSteps: session.flow.steps.length,
      collectedData: session.collectedData,
      flow: {
        id: session.flow.id,
        name: session.flow.name,
        steps: session.flow.steps,
      },
    },
  });
});

// ─── POST /api/v1/session/start ───────────────────────────────────────────────
// Start or resume an onboarding session for a user
router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  const { userId, page, metadata } = req.body as {
    userId: string;
    page?: string;
    metadata?: Record<string, unknown>;
  };

  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  const endUser = await getOrCreateEndUser(req.organization!.id, userId, metadata ?? {});

  // find the org's active flow
  const baseFlow = await prisma.onboardingFlow.findFirst({
    where: { organizationId: req.organization!.id, isActive: true },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!baseFlow || baseFlow.steps.length === 0) {
    res.json({ session: null, message: 'No active onboarding flow configured' });
    return;
  }

  // ── A/B experiment assignment ────────────────────────────────────────────────
  // If there is a running experiment for this flow, deterministically assign the
  // user to control or variant and load the appropriate flow.
  let flow = baseFlow;
  let experimentId: string | null = null;
  let experimentVariant: 'control' | 'variant' | null = null;

  const experiment = await prisma.flowExperiment.findFirst({
    where: { controlFlowId: baseFlow.id, status: 'running', organizationId: req.organization!.id },
  });

  if (experiment) {
    // Check if user was already assigned in a prior session
    const existingAssignment = await prisma.userOnboardingSession.findFirst({
      where: {
        endUserId: endUser.id,
        experimentId: experiment.id,
      },
      select: { flowId: true, experimentVariant: true },
    });

    if (existingAssignment) {
      // Respect prior assignment
      experimentVariant = existingAssignment.experimentVariant as 'control' | 'variant';
      if (existingAssignment.experimentVariant === 'variant') {
        const variantFlow = await prisma.onboardingFlow.findUnique({
          where: { id: experiment.variantFlowId },
          include: { steps: { orderBy: { order: 'asc' } } },
        });
        if (variantFlow) flow = variantFlow;
      }
    } else {
      // Fresh assignment — deterministic hash of userId + experimentId → bucket 0-99
      const raw = userId + experiment.id;
      const bucket = raw.split('').reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) >>> 0), 0) % 100;
      experimentVariant = bucket < experiment.trafficSplit ? 'variant' : 'control';

      if (experimentVariant === 'variant') {
        const variantFlow = await prisma.onboardingFlow.findUnique({
          where: { id: experiment.variantFlowId },
          include: { steps: { orderBy: { order: 'asc' } } },
        });
        if (variantFlow) flow = variantFlow;
      }
    }
    experimentId = experiment.id;
  }
  // ── end experiment assignment ────────────────────────────────────────────────

  // upsert session
  let session = await prisma.userOnboardingSession.findUnique({
    where: { endUserId_flowId: { endUserId: endUser.id, flowId: flow.id } },
    include: { stepProgress: true },
  });

  if (!session) {
    session = await prisma.userOnboardingSession.create({
      data: {
        endUserId: endUser.id,
        organizationId: req.organization!.id,
        flowId: flow.id,
        currentStepId: flow.steps[0].id,
        status: 'active',
        experimentId,
        experimentVariant,
      },
      include: { stepProgress: true },
    });
  } else if (session.status === 'completed') {
    // Return completed session so widget can show completion state gracefully
    const completedStepIds = session.stepProgress.filter((p) => p.status === 'completed').map((p) => p.stepId);
    const flow = await prisma.onboardingFlow.findUnique({
      where: { id: session.flowId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    res.json({
      session: {
        id: session.id,
        status: 'completed',
        currentStep: flow?.steps[flow.steps.length - 1] ?? null,
        completedStepIds,
        totalSteps: flow?.steps.length ?? 0,
        collectedData: session.collectedData,
        flow: flow ? { id: flow.id, name: flow.name, steps: flow.steps } : null,
      },
    });
    return;
  }

  // if page is provided, try to detect intent and jump to the right step
  if (page) {
    const detectedStepId = await detectIntent(page, 'page_view', flow.steps).catch(() => null);
    if (detectedStepId && detectedStepId !== session.currentStepId) {
      const detectedStep = flow.steps.find((s) => s.id === detectedStepId);
      const currentStep = flow.steps.find((s) => s.id === session!.currentStepId);
      // only advance, not go back
      if (detectedStep && currentStep && detectedStep.order >= currentStep.order) {
        await prisma.userOnboardingSession.update({
          where: { id: session.id },
          data: { currentStepId: detectedStepId, lastActiveAt: new Date() },
        });
        session.currentStepId = detectedStepId;
      }
    }
  }

  const completedStepIds = session.stepProgress
    .filter((p) => p.status === 'completed')
    .map((p) => p.stepId);

  const currentStep = flow.steps.find((s) => s.id === session!.currentStepId) ?? flow.steps[0];

  // Check if returning user (has any other sessions for this org)
  const otherSessionCount = await prisma.userOnboardingSession.count({
    where: { endUserId: endUser.id, NOT: { id: session.id } },
  });

  res.json({
    session: {
      id: session.id,
      status: session.status,
      currentStep,
      completedStepIds,
      totalSteps: flow.steps.length,
      collectedData: session.collectedData,
      flow: { id: flow.id, name: flow.name, steps: flow.steps },
    },
    isReturning: otherSessionCount > 0,
  });
});

// ─── POST /api/v1/session/act ─────────────────────────────────────────────────
// The AI agent processes the user's message in the context of the current step
// and returns an action (ask question, do action, complete step, celebrate)
router.post('/act', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, userMessage, pageContext } = req.body as {
    sessionId: string;
    userMessage: string;
    pageContext?: import('../services/agent').PageContext;
  };

  if (!sessionId || !userMessage) {
    res.status(400).json({ error: 'sessionId and userMessage required' });
    return;
  }

  const session = await prisma.userOnboardingSession.findFirstOrThrow({
    where: { id: sessionId, organizationId: req.organization!.id },
    include: {
      flow: { include: { steps: { orderBy: { order: 'asc' } } } },
      stepProgress: true,
    },
  });

  if (session.status === 'completed') {
    res.status(400).json({ error: 'Session already completed' });
    return;
  }

  const currentStep = session.flow.steps.find((s) => s.id === session.currentStepId);
  if (!currentStep) {
    res.status(400).json({ error: 'No current step found' });
    return;
  }

  const isLastStep =
    currentStep.order === Math.max(...session.flow.steps.map((s) => s.order));

  // load recent conversation for context (last 6 from this session's step)
  const recentMessages = await prisma.message.findMany({
    where: {
      conversation: {
        endUserId: session.endUserId,
        organizationId: req.organization!.id,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  const conversationHistory = recentMessages
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Fetch user history for returning-user context (non-blocking on failure)
  const userHistory = await getUserHistory(session.endUserId, session.id).catch(() => null);

  // run the agent
  const action = await runAgent({
    org: req.organization!,
    step: currentStep,
    userMessage,
    collectedData: session.collectedData as Record<string, unknown>,
    conversationHistory,
    isLastStep,
    pageContext,
    userHistoryFormatted: userHistory?.formatted,
  });

  // ─── Handle side effects of the action ───────────────────────────────────

  if (action.type === 'complete_step') {
    // merge collected data
    const newData = {
      ...(session.collectedData as Record<string, unknown>),
      ...(action.collectedData ?? {}),
    };

    // find next step
    const currentOrder = currentStep.order;
    const nextStep = session.flow.steps.find((s) => s.order > currentOrder);

    // count how many messages were exchanged on this step (intelligence pipeline)
    const existing = await prisma.userStepProgress.findUnique({
      where: { sessionId_stepId: { sessionId: session.id, stepId: currentStep.id } },
      select: { startedAt: true, attempts: true },
    });
    const timeSpentMs = existing?.startedAt
      ? Date.now() - existing.startedAt.getTime()
      : 0;

    // upsert step progress — capture intelligence fields
    await prisma.userStepProgress.upsert({
      where: { sessionId_stepId: { sessionId: session.id, stepId: currentStep.id } },
      create: {
        sessionId: session.id,
        stepId: currentStep.id,
        status: 'completed',
        startedAt: existing?.startedAt ?? new Date(),
        completedAt: new Date(),
        aiAssisted: true,
        timeSpentMs,
        messagesCount: (existing?.attempts ?? 0) + 1,
        promptSnapshot: currentStep.aiPrompt || null,
        outcome: 'completed',
      },
      update: {
        status: 'completed',
        completedAt: new Date(),
        aiAssisted: true,
        timeSpentMs,
        messagesCount: (existing?.attempts ?? 0) + 1,
        promptSnapshot: currentStep.aiPrompt || null,
        outcome: 'completed',
      },
    });

    if (nextStep) {
      await prisma.userOnboardingSession.update({
        where: { id: session.id },
        data: {
          currentStepId: nextStep.id,
          collectedData: newData,
          lastActiveAt: new Date(),
        },
      });
    } else {
      // all done
      await prisma.userOnboardingSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          collectedData: newData,
          completedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });
    }

    // Fire integration events (non-blocking)
    const endUser = await prisma.endUser.findUnique({ where: { id: session.endUserId }, select: { externalId: true } });
    if (endUser?.externalId) {
      fireIntegrationEvents({
        orgId: req.organization!.id,
        userId: endUser.externalId,
        event: nextStep ? 'Step Completed' : 'Onboarding Completed',
        properties: {
          stepTitle: currentStep.title,
          stepOrder: currentStep.order,
          flowName: session.flow.name,
          isMilestone: currentStep.isMilestone,
          timeSpentMs,
          aiAssisted: true,
        },
      }).catch(() => {});
    }
  } else if (action.type === 'celebrate_milestone') {
    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: {
        firstValueAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  } else if (action.type === 'verify_integration') {
    // Just update last active — don't count as a message attempt
    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });
  } else if (action.type === 'escalate_to_human') {
    // Create ticket + notify team (non-blocking)
    const endUser = await prisma.endUser.findUnique({
      where: { id: session.endUserId },
      select: { externalId: true, metadata: true },
    });

    const context = {
      userId: endUser?.externalId ?? null,
      userMetadata: (endUser?.metadata ?? {}) as Record<string, unknown>,
      flowName: session.flow.name,
      stepTitle: currentStep.title,
      collectedData: session.collectedData as Record<string, unknown>,
      recentMessages: conversationHistory.slice(-6),
    };

    createEscalationTicket({
      organizationId: req.organization!.id,
      endUserId: session.endUserId,
      sessionId: session.id,
      stepId: currentStep.id,
      trigger: action.trigger as 'agent_detected' | 'user_requested',
      reason: action.reason,
      agentMessage: action.message,
      context,
    }).then((ticket) =>
      notifyTeam({
        orgId: req.organization!.id,
        orgName: req.organization!.name,
        ticketId: ticket.id,
        context,
        reason: action.reason,
      })
    ).catch((e) => console.error('[escalation] ticket creation failed:', e));

    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });
  } else {
    // mark step in_progress + bump last active
    // look up existing record first so we preserve the original startedAt
    const existing = await prisma.userStepProgress.findUnique({
      where: { sessionId_stepId: { sessionId: session.id, stepId: currentStep.id } },
      select: { startedAt: true },
    });
    await prisma.userStepProgress.upsert({
      where: { sessionId_stepId: { sessionId: session.id, stepId: currentStep.id } },
      create: {
        sessionId: session.id,
        stepId: currentStep.id,
        status: 'in_progress',
        startedAt: new Date(),
        attempts: 1,
      },
      update: {
        status: 'in_progress',
        attempts: { increment: 1 },
        startedAt: existing?.startedAt ?? new Date(),
      },
    });
    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });
  }

  res.json({ action });
});

// ─── POST /api/v1/session/event ───────────────────────────────────────────────
// Widget fires this when a completion event occurs (e.g. "data_connected")
// If the current step has a matching completionEvent, auto-advance
router.post('/event', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, eventType } = req.body as { sessionId: string; eventType: string };

  const session = await prisma.userOnboardingSession.findFirstOrThrow({
    where: { id: sessionId, organizationId: req.organization!.id },
    include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });

  const currentStep = session.flow.steps.find((s) => s.id === session.currentStepId);
  if (!currentStep || currentStep.completionEvent !== eventType) {
    res.json({ advanced: false });
    return;
  }

  const nextStep = session.flow.steps.find((s) => s.order > currentStep.order);

  await prisma.userStepProgress.upsert({
    where: { sessionId_stepId: { sessionId: session.id, stepId: currentStep.id } },
    create: { sessionId: session.id, stepId: currentStep.id, status: 'completed', completedAt: new Date(), aiAssisted: false },
    update: { status: 'completed', completedAt: new Date() },
  });

  if (nextStep) {
    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: { currentStepId: nextStep.id, lastActiveAt: new Date() },
    });
  } else {
    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: { status: 'completed', completedAt: new Date(), lastActiveAt: new Date() },
    });
  }

  const isMilestone = currentStep.isMilestone;
  if (isMilestone) {
    await prisma.userOnboardingSession.update({
      where: { id: session.id },
      data: { firstValueAt: new Date() },
    });
  }

  // Fire integration events (non-blocking)
  const endUser = await prisma.endUser.findUnique({ where: { id: session.endUserId }, select: { externalId: true } });
  if (endUser?.externalId) {
    fireIntegrationEvents({
      orgId: req.organization!.id,
      userId: endUser.externalId,
      event: nextStep ? 'Step Completed' : 'Onboarding Completed',
      properties: {
        stepTitle: currentStep.title,
        stepOrder: currentStep.order,
        flowName: session.flow.name,
        isMilestone,
        completionEvent: eventType,
        aiAssisted: false,
      },
    }).catch(() => {});
  }

  res.json({ advanced: true, nextStep: nextStep ?? null, milestone: isMilestone });
});

export default router;
