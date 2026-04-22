import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateApiKey } from '../middleware/auth';
import { getMtuUsage } from '../middleware/rateLimit';
import { PLANS } from '../lib/plans';
import { runAgentSafe, runAgentStream, runAgentGoal, runAgentPlan, GoalTurn } from '../services/agent';
import { detectIntent } from '../services/intent';
import { detectLanguage, translateText, transcribeAudio, synthesizeSpeech, isSarvamEnabled } from '../services/sarvam';

import { getUserHistory } from '../services/userhistory';
import { logger } from '../lib/logger';
import { createEscalationTicket, notifyTeam } from '../services/escalation';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateApiKey);

async function localizeAction(
  action: import('../services/agent').AgentAction,
  lang: string
): Promise<import('../services/agent').AgentAction> {
  if (lang === 'en' || !isSarvamEnabled()) return action;
  const t = (s: string) => translateText(s, lang, 'en');

  if (action.type === 'ask_clarification') {
    return { ...action, question: await t(action.question) };
  }
  if (action.type === 'complete_step') {
    return { ...action, message: await t(action.message) };
  }
  if (action.type === 'celebrate_milestone') {
    return {
      ...action,
      headline: await t(action.headline),
      insight: await t(action.insight),
    };
  }
  if (action.type === 'chat') {
    return { ...action, content: await t(action.content) };
  }
  if (action.type === 'escalate_to_human') {
    return { ...action, message: await t(action.message) };
  }
  return action;
}

// ─── Helper: get or create end user ──────────────────────────────────────────
async function getOrCreateEndUser(orgId: string, userId: string, metadata: Record<string, unknown>) {
  return prisma.endUser.upsert({
    where: { organizationId_externalId: { organizationId: orgId, externalId: userId } },
    create: {
      organizationId: orgId,
      externalId: userId,
      metadata: metadata as Prisma.InputJsonValue,
      lastSeenAt: new Date(),
    },
    update: { metadata: metadata as Prisma.InputJsonValue, lastSeenAt: new Date() },
  });
}

// ─── POST /api/v1/session/warmup ─────────────────────────────────────────────
// Phase 5: called by the widget on idle init to pre-warm DB connection pool and
// Prisma client before the user types anything. Returns 200 immediately.
// No DB writes — just a lightweight ping that keeps the connection warm.
router.post('/warmup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fire-and-forget: validate org key is valid (already done by middleware)
    // and ping the DB so connection pool is warm for the real first request.
    prisma.$queryRaw`SELECT 1`.catch(() => {});
    res.json({ warmed: true, ts: Date.now() });
  } catch {
    res.json({ warmed: false });
  }
});

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
// Start or resume an onboarding session for a user.
// Pass testMode: true to preview the flow without writing anything to the DB.
router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  const { userId, page, metadata, testMode } = req.body as {
    userId: string;
    page?: string;
    metadata?: Record<string, unknown>;
    testMode?: boolean;
  };

  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  // ── Test mode: return a preview session without any DB writes ────────────
  if (testMode) {
    const previewFlow = await prisma.onboardingFlow.findFirst({
      where: { organizationId: req.organization!.id, isActive: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!previewFlow || previewFlow.steps.length === 0) {
      res.json({ session: null, message: 'No active flow to preview' });
      return;
    }
    res.json({
      session: {
        id: 'preview',
        testMode: true,
        status: 'active',
        currentStep: previewFlow.steps[0],
        completedStepIds: [],
        totalSteps: previewFlow.steps.length,
        collectedData: {},
        flow: previewFlow,
      },
    });
    return;
  }

  const org = req.organization!;
  const plan = PLANS[org.planType] ?? PLANS.free;

  // Upsert end user first (idempotent) — eliminates MTU TOCTOU race
  const endUser = await getOrCreateEndUser(org.id, userId, metadata ?? {});

  // MTU check after upsert: count is now accurate
  if (plan.mtuLimit > 0) {
    const mtuUsed = await getMtuUsage(org.id);
    if (mtuUsed > plan.mtuLimit) {
      res.status(429).json({
        error: 'Monthly Tracked User limit reached',
        limit: plan.mtuLimit,
        used: mtuUsed,
        upgradeUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings/billing`,
      });
      return;
    }
  }

  // find the org's active flow — prefer role-targeted, fall back to global (empty targetRoles)
  const userRole = (metadata?.role as string | undefined) ?? '';
  const baseFlow = await (async () => {
    if (userRole) {
      const roleFlow = await prisma.onboardingFlow.findFirst({
        where: { organizationId: req.organization!.id, isActive: true, targetRoles: { has: userRole } },
        include: { steps: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      });
      if (roleFlow) return roleFlow;
    }
    return prisma.onboardingFlow.findFirst({
      where: { organizationId: req.organization!.id, isActive: true, targetRoles: { isEmpty: true } },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  })();

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
    // Trigger controls — widget reads these to decide when/where to show
    trigger: {
      delayMs: flow.triggerDelayMs,
      urlPattern: flow.urlPattern,
      maxTriggersPerUser: flow.maxTriggersPerUser,
    },
  });
});

// ─── Guard: prevent premature complete_step ───────────────────────────────────
// If the agent returns complete_step but required smart questions are still
// unanswered, override with ask_clarification for the first missing question.
function guardCompleteStep(
  action: import('../services/agent').AgentAction,
  step: { smartQuestions: unknown },
  collectedData: Record<string, unknown>,
): import('../services/agent').AgentAction {
  if (action.type !== 'complete_step') return action;

  const questions = (step.smartQuestions as string[]) ?? [];
  const unanswered = questions.filter((q) => !(q in collectedData) || collectedData[q] === '');

  if (unanswered.length === 0) return action; // all answered — allow completion

  return {
    type: 'ask_clarification',
    question: unanswered[0],
    options: undefined,
  };
}

// ─── Shared helper: load session context (parallelised DB reads) ───────────────
async function loadSessionContext(sessionId: string, orgId: string) {
  const [session, sessionMessages] = await Promise.all([
    prisma.userOnboardingSession.findFirstOrThrow({
      where: { id: sessionId, organizationId: orgId },
      include: {
        flow: { include: { steps: { orderBy: { order: 'asc' } } } },
        stepProgress: true,
        endUser: { select: { id: true, externalId: true, metadata: true } },
      },
    }),
    prisma.sessionMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20, // last 20 stored turns → up to 10 exchanges
    }),
  ]);

  const conversationHistory = sessionMessages
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  return { session, conversationHistory };
}

// ─── Shared helper: apply action side-effects and store messages ───────────────
// Returns the assistant SessionMessage id (null for internal messages)
async function applyActionSideEffects(opts: {
  action: import('../services/agent').AgentAction;
  session: Awaited<ReturnType<typeof loadSessionContext>>['session'];
  currentStep: { id: string; order: number; aiPrompt: string };
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  orgId: string;
}): Promise<string | null> {
  const { action, session, currentStep, userMessage, orgId } = opts;

  const isInternalMessage = userMessage === '__init__' || userMessage === '__verify__';

  // ── Store messages (skip internal triggers) — return assistant message id ─
  let assistantMessageId: string | null = null;
  if (!isInternalMessage) {
    const agentContent =
      action.type === 'execute_page_action' ? action.message :
      action.type === 'ask_clarification'   ? action.question :
      action.type === 'complete_step'        ? action.message :
      action.type === 'celebrate_milestone'  ? action.headline :
      action.type === 'escalate_to_human'    ? action.message :
      action.type === 'chat'                 ? action.content :
      '';

    await prisma.sessionMessage.create({
      data: {
        sessionId: session.id,
        stepId: currentStep.id,
        role: 'user',
        content: userMessage,
      },
    });

    const assistantMsg = await prisma.sessionMessage.create({
      data: {
        sessionId: session.id,
        stepId: currentStep.id,
        role: 'assistant',
        content: agentContent,
        actionType: action.type,
      },
    });
    assistantMessageId = assistantMsg.id;

    // ── Audit log — fire-and-forget, never block the response ──────────────
    const auditPayload: Record<string, unknown> = { message: agentContent };
    if (action.type === 'execute_page_action') {
      auditPayload.actionType = action.actionType;
      auditPayload.payload    = action.payload;
    } else if (action.type === 'ask_clarification') {
      auditPayload.options = action.options;
    } else if (action.type === 'complete_step') {
      auditPayload.collectedData = action.collectedData;
    }
    prisma.auditLog.create({
      data: {
        organizationId: orgId,
        sessionId: session.id,
        endUserId: session.endUserId,
        stepId: currentStep.id,
        actionType: action.type === 'execute_page_action' ? action.actionType : action.type,
        payload: auditPayload as Prisma.InputJsonValue,
      },
    }).catch(() => {}); // non-blocking
  }

  // ── Step progress + session state ─────────────────────────────────────────
  if (action.type === 'complete_step' || action.type === 'celebrate_milestone') {
    const newData = {
      ...(session.collectedData as Record<string, unknown>),
      ...(action.type === 'complete_step' ? (action.collectedData ?? {}) : {}),
    };

    const nextStep = session.flow.steps.find((s) => s.order > currentStep.order);

    const existing = await prisma.userStepProgress.findUnique({
      where: { sessionId_stepId: { sessionId: session.id, stepId: currentStep.id } },
      select: { startedAt: true, attempts: true },
    });
    const timeSpentMs = existing?.startedAt ? Date.now() - existing.startedAt.getTime() : 0;
    const msgCount = await prisma.sessionMessage.count({
      where: { sessionId: session.id, stepId: currentStep.id, role: 'user' },
    });

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
        messagesCount: msgCount,
        promptSnapshot: currentStep.aiPrompt || null,
        outcome: 'completed',
      },
      update: {
        status: 'completed',
        completedAt: new Date(),
        aiAssisted: true,
        timeSpentMs,
        messagesCount: msgCount,
        promptSnapshot: currentStep.aiPrompt || null,
        outcome: 'completed',
      },
    });

    if (action.type === 'celebrate_milestone') {
      await prisma.userOnboardingSession.update({
        where: { id: session.id },
        data: { firstValueAt: new Date(), lastActiveAt: new Date() },
      });
    } else if (nextStep) {
      await prisma.userOnboardingSession.update({
        where: { id: session.id },
        data: {
          currentStepId: nextStep.id,
          collectedData: newData as Prisma.InputJsonValue,
          lastActiveAt: new Date(),
        },
      });
    } else {
      await prisma.userOnboardingSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          collectedData: newData as Prisma.InputJsonValue,
          completedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });
    }

  } else if (action.type === 'escalate_to_human') {
    const context = {
      userId: session.endUser.externalId ?? null,
      userMetadata: (session.endUser.metadata ?? {}) as Record<string, unknown>,
      flowName: session.flow.name,
      stepTitle: (currentStep as { id: string; order: number; aiPrompt: string; title?: string }).title ?? '',
      collectedData: session.collectedData as Record<string, unknown>,
      recentMessages: opts.conversationHistory.slice(-6),
    };

    createEscalationTicket({
      organizationId: orgId,
      endUserId: session.endUserId,
      sessionId: session.id,
      stepId: currentStep.id,
      trigger: action.trigger as 'agent_detected' | 'user_requested',
      reason: action.reason,
      agentMessage: action.message,
      context,
    }).then((ticket) =>
      notifyTeam({
        orgId,
        orgName: session.flow.name,
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
    // in_progress — preserve original startedAt
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

  return assistantMessageId;
}

// ─── POST /api/v1/session/heal ───────────────────────────────────────────────
// Widget reports whenever the self-healing resolver had to fall back (or fail).
// Writes to selector_heal_logs and fires the org's alert webhook after 3+
// failures for the same selector within 24 h.
router.post('/heal', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, stepId, originalSelector, usedSelector, strategy, actionType, page } =
    req.body as {
      sessionId?: string;
      stepId?: string;
      originalSelector: string;
      usedSelector?: string;
      strategy: string;
      actionType?: string;
      page: string;
    };

  if (!originalSelector || !strategy || !page) {
    res.status(400).json({ error: 'originalSelector, strategy, and page are required' });
    return;
  }

  const org = req.organization!;

  await prisma.selectorHealLog.create({
    data: {
      organizationId: org.id,
      sessionId:        sessionId  ?? null,
      stepId:           stepId     ?? null,
      originalSelector,
      usedSelector:     usedSelector ?? null,
      strategy,
      actionType:       actionType ?? null,
      page,
    },
  });

  // ── Webhook alert on repeated failures ─────────────────────────────────────
  if (strategy === 'failed' && org.selectorAlertEnabled && org.selectorAlertWebhook) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailures = await prisma.selectorHealLog.count({
      where: {
        organizationId: org.id,
        originalSelector,
        strategy: 'failed',
        createdAt: { gte: since24h },
      },
    });

    // Alert threshold: 3 failures in 24 h — avoids noise on one-off misses
    if (recentFailures >= 3) {
      fetch(org.selectorAlertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ Broken selector: \`${originalSelector}\` has failed ${recentFailures}× in the last 24 h on \`${page}\`. Update the step's actionConfig selector.`,
          selector: originalSelector,
          page,
          failures: recentFailures,
          stepId: stepId ?? null,
        }),
      }).catch(() => {}); // non-blocking — never interrupt the flow
    }
  }

  res.json({ logged: true });
});

// ─── POST /api/v1/session/feedback ───────────────────────────────────────────
// Widget sends thumbs up (1) or thumbs down (-1) for an assistant message.
router.post('/feedback', async (req: AuthenticatedRequest, res: Response) => {
  const { messageId, value } = req.body as { messageId: string; value: number };

  if (!messageId || (value !== 1 && value !== -1)) {
    res.status(400).json({ error: 'messageId and value (1 or -1) required' });
    return;
  }

  // Verify the message belongs to a session in this org
  const msg = await prisma.sessionMessage.findFirst({
    where: {
      id: messageId,
      session: { organizationId: req.organization!.id },
    },
    select: { id: true },
  });

  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  await prisma.sessionMessage.update({
    where: { id: messageId },
    data: { feedback: value },
  });

  res.json({ saved: true });
});

// ─── POST /api/v1/session/act ─────────────────────────────────────────────────
router.post('/act', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, userMessage, pageContext, testMode } = req.body as {
    sessionId: string;
    userMessage: string;
    pageContext?: import('../services/agent').PageContext;
    testMode?: boolean;
  };

  if (!sessionId || !userMessage) {
    res.status(400).json({ error: 'sessionId and userMessage required' });
    return;
  }
  if (userMessage.length > 2000) {
    res.status(400).json({ error: 'userMessage too long (max 2000 characters)' });
    return;
  }

  // ── Test / preview mode ───────────────────────────────────────────────────
  if (testMode || sessionId === 'preview') {
    const previewFlow = await prisma.onboardingFlow.findFirst({
      where: { organizationId: req.organization!.id, isActive: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!previewFlow || previewFlow.steps.length === 0) {
      res.status(400).json({ error: 'No active flow' });
      return;
    }
    const step = previewFlow.steps[0];
    const action = await runAgentSafe({
      org: req.organization!,
      step,
      userMessage,
      collectedData: {},
      conversationHistory: [],
      isLastStep: previewFlow.steps.length === 1,
      pageContext,
      sessionId: 'preview',
    });
    res.json({ action, testMode: true });
    return;
  }

  // ── Monthly message limit ────────────────────────────────────────────────────
  const _monthStart = new Date(); _monthStart.setDate(1); _monthStart.setHours(0, 0, 0, 0);
  const _msgUsed = await prisma.sessionMessage.count({
    where: { session: { organizationId: req.organization!.id }, role: 'assistant', createdAt: { gte: _monthStart } },
  });
  if (_msgUsed >= req.organization!.monthlyMessageLimit) {
    res.status(429).json({ error: 'Monthly message limit reached', limit: req.organization!.monthlyMessageLimit, used: _msgUsed });
    return;
  }

  const { session, conversationHistory } = await loadSessionContext(sessionId, req.organization!.id);

  if (session.status === 'completed') {
    res.status(400).json({ error: 'Session already completed' });
    return;
  }

  const currentStep = session.flow.steps.find((s) => s.id === session.currentStepId);
  if (!currentStep) {
    res.status(400).json({ error: 'No current step found' });
    return;
  }

  const isLastStep = currentStep.order === Math.max(...session.flow.steps.map((s) => s.order));

  // Fetch user history (non-blocking)
  const userHistory = await getUserHistory(session.endUserId, session.id).catch(() => null);

  const detectedLang = await detectLanguage(userMessage);
  const agentMessage = detectedLang !== 'en'
    ? await translateText(userMessage, 'en', detectedLang)
    : userMessage;

  const action = await runAgentSafe({
    org: req.organization!,
    step: currentStep,
    userMessage: agentMessage,
    collectedData: session.collectedData as Record<string, unknown>,
    conversationHistory,
    isLastStep,
    pageContext,
    userHistoryFormatted: userHistory?.formatted,
    userMetadata: (session.endUser.metadata ?? {}) as Record<string, unknown>,
    sessionId: session.id,
    detectedLang,
  });

  // ── Guard: block premature complete_step ─────────────────────────────────
  const guardedAction = guardCompleteStep(action, currentStep, session.collectedData as Record<string, unknown>);
  const localizedAction = await localizeAction(guardedAction, detectedLang);

  const messageId = await applyActionSideEffects({
    action: localizedAction,
    session,
    currentStep,
    userMessage,
    conversationHistory,
    orgId: req.organization!.id,
  });

  res.json({ action: localizedAction, messageId });
});

// ─── In-memory rate limiter (per session, not per IP) ────────────────────────
// Caps at 30 agent calls per 60-second window. Resets automatically.
const actRateLimit = new Map<string, { count: number; windowStart: number }>();
const ACT_MAX    = 30;
const ACT_WINDOW = 60_000; // 1 minute

function checkActRateLimit(sessionId: string): boolean {
  const now   = Date.now();
  const entry = actRateLimit.get(sessionId);

  if (!entry || now - entry.windowStart > ACT_WINDOW) {
    actRateLimit.set(sessionId, { count: 1, windowStart: now });
    return true; // within limit
  }

  if (entry.count >= ACT_MAX) return false; // exceeded

  entry.count++;
  return true;
}

// Purge stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - ACT_WINDOW * 2;
  for (const [id, entry] of actRateLimit.entries()) {
    if (entry.windowStart < cutoff) actRateLimit.delete(id);
  }
}, 5 * 60_000);

// ─── POST /api/v1/session/act/stream — SSE streaming variant ─────────────────
// Sends a `thinking` event immediately on connect so the widget shows a typing
// indicator. Sends the `action` event when the agent finishes. Closes with `done`.
router.post('/act/stream', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, userMessage, pageContext } = req.body as {
    sessionId: string;
    userMessage: string;
    pageContext?: import('../services/agent').PageContext;
  };

  if (!sessionId || !userMessage) {
    res.status(400).json({ error: 'sessionId and userMessage required' });
    return;
  }
  if (userMessage.length > 2000) {
    res.status(400).json({ error: 'userMessage too long (max 2000 characters)' });
    return;
  }

  // ── Monthly message limit ─────────────────────────────────────────────────
  const _sMonthStart = new Date(); _sMonthStart.setDate(1); _sMonthStart.setHours(0, 0, 0, 0);
  const _sMsgUsed = await prisma.sessionMessage.count({
    where: { session: { organizationId: req.organization!.id }, role: 'assistant', createdAt: { gte: _sMonthStart } },
  });
  if (_sMsgUsed >= req.organization!.monthlyMessageLimit) {
    res.status(429).json({ error: 'Monthly message limit reached', limit: req.organization!.monthlyMessageLimit, used: _sMsgUsed });
    return;
  }

  // ── Rate limit check ──────────────────────────────────────────────────────
  if (!checkActRateLimit(sessionId)) {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return;
  }

  // ── Set SSE headers immediately — this is what eliminates perceived latency ─
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Acknowledge immediately — widget shows typing indicator
  send('thinking', { ts: Date.now() });

  try {
    const { session, conversationHistory } = await loadSessionContext(sessionId, req.organization!.id);

    if (session.status === 'completed') {
      send('error', { message: 'Session already completed' });
      res.end();
      return;
    }

    const currentStep = session.flow.steps.find((s) => s.id === session.currentStepId);
    if (!currentStep) {
      send('error', { message: 'No current step' });
      res.end();
      return;
    }

    // ── Real GPT-4o streaming ─────────────────────────────────────────────────
    // runAgentStream yields { type:'word' } tokens as arguments build in GPT-4o,
    // then a final { type:'action' } when the tool call is complete.
    // Words are sent immediately — no artificial delay.
    const isLastStep  = currentStep.order === Math.max(...session.flow.steps.map((s) => s.order));
    const userHistory = await getUserHistory(session.endUserId, session.id).catch(() => null);

    const streamDetectedLang = await detectLanguage(userMessage);
    const streamAgentMessage = streamDetectedLang !== 'en'
      ? await translateText(userMessage, 'en', streamDetectedLang)
      : userMessage;

    let finalAction: import('../services/agent').AgentAction | null = null;
    const streamStart = Date.now();
    let firstTokenLogged = false;

    for await (const event of runAgentStream({
      org: req.organization!,
      step: currentStep,
      userMessage: streamAgentMessage,
      collectedData: session.collectedData as Record<string, unknown>,
      conversationHistory,
      isLastStep,
      pageContext,
      userHistoryFormatted: userHistory?.formatted,
      userMetadata: (session.endUser.metadata ?? {}) as Record<string, unknown>,
      detectedLang: streamDetectedLang,
    })) {
      if (event.type === 'word') {
        if (!firstTokenLogged) {
          logger.info('agent.stream.first_token_ms', { ms: Date.now() - streamStart, orgId: req.organization?.id });
          firstTokenLogged = true;
        }
        send('text', { word: event.word });
      } else {
        finalAction = event.action;
      }
    }

    if (!finalAction) {
      send('error', { message: 'Agent returned no action' });
      res.end();
      return;
    }

    const guardedAction = guardCompleteStep(finalAction, currentStep, session.collectedData as Record<string, unknown>);
    const localizedStreamAction = await localizeAction(guardedAction, streamDetectedLang);

    const messageId = await applyActionSideEffects({
      action: localizedStreamAction,
      session,
      currentStep,
      userMessage,
      conversationHistory,
      orgId: req.organization!.id,
    });

    send('action', { action: localizedStreamAction, messageId });
    send('done', {});
  } catch (err) {
    send('error', { message: err instanceof Error ? err.message : 'Agent error' });
  } finally {
    res.end();
  }
});

// ─── POST /api/v1/session/act/plan — decompose goal into phases ──────────────
router.post('/act/plan', async (req: AuthenticatedRequest, res: Response) => {
  const { goal, pageContext } = req.body as {
    goal: string;
    pageContext?: import('../services/agent').PageContext;
  };

  if (!goal || goal.length > 500) {
    res.status(400).json({ error: 'goal required, max 500 chars' });
    return;
  }

  const phases = await runAgentPlan({ org: req.organization!, goal, pageContext });
  res.json({ phases });
});

// ─── POST /api/v1/session/act/goal — ReAct goal mode ─────────────────────────
router.post('/act/goal', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, goal, pageContext, turnHistory = [], turnCount = 0 } = req.body as {
    sessionId: string;
    goal: string;
    pageContext: import('../services/agent').PageContext;
    turnHistory?: GoalTurn[];
    turnCount?: number;
  };

  if (!sessionId || !goal) {
    res.status(400).json({ error: 'sessionId and goal required' });
    return;
  }
  if (goal.length > 500) {
    res.status(400).json({ error: 'goal too long (max 500 chars)' });
    return;
  }
  if (turnCount >= 12) {
    res.status(200).json({
      action: { type: 'escalate_to_human', reason: 'max_turns_reached', trigger: 'agent_detected', message: 'I\'ve tried several approaches. Let me connect you with a team member.' },
      done: true,
      turnCount,
    });
    return;
  }

  const action = await runAgentGoal({
    org: req.organization!,
    goal,
    pageContext,
    turnHistory,
    sessionId,
  });

  const done = action.type === 'goal_complete' || action.type === 'escalate_to_human';

  // Persist to audit log for traceability (SessionMessage requires stepId FK — skip it for goal mode)
  prisma.auditLog.create({
    data: {
      organizationId: req.organization!.id,
      sessionId,
      actionType: action.type,
      payload: { goal, turnCount, action } as import('@prisma/client').Prisma.InputJsonValue,
    },
  }).catch(() => {}); // non-blocking

  res.json({ action, done, turnCount: turnCount + 1 });
});

// ─── POST /api/v1/session/stt ────────────────────────────────────────────────
router.post('/stt', async (req: AuthenticatedRequest, res: Response) => {
  const { audioBase64, languageCode } = req.body as { audioBase64?: string; languageCode?: string };

  if (!audioBase64) {
    res.status(400).json({ error: 'audioBase64 required' });
    return;
  }
  if (!isSarvamEnabled()) {
    res.status(503).json({ error: 'Sarvam API key not configured' });
    return;
  }

  const transcript = await transcribeAudio(audioBase64, languageCode);
  const detectedLang = await detectLanguage(transcript);
  res.json({ transcript, detectedLang });
});

// ─── POST /api/v1/session/tts ────────────────────────────────────────────────
router.post('/tts', async (req: AuthenticatedRequest, res: Response) => {
  const { text, languageCode } = req.body as { text?: string; languageCode?: string };

  if (!text) {
    res.status(400).json({ error: 'text required' });
    return;
  }
  if (!isSarvamEnabled()) {
    res.status(503).json({ error: 'Sarvam API key not configured' });
    return;
  }

  const audioBuffer = await synthesizeSpeech(text, languageCode);
  res.json({ audioBase64: audioBuffer.toString('base64') });
});

// ─── POST /api/v1/session/page-change ────────────────────────────────────────
// Widget sends this on every SPA navigation. Re-runs intent detection and
// advances the session's currentStep if the new page matches a later step.
router.post('/page-change', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, page } = req.body as { sessionId: string; page: string };
  if (!sessionId || !page) {
    res.status(400).json({ error: 'sessionId and page required' });
    return;
  }

  const session = await prisma.userOnboardingSession.findFirst({
    where: { id: sessionId, organizationId: req.organization!.id, status: 'active' },
    include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });

  if (!session) {
    res.json({ advanced: false });
    return;
  }

  const currentStep = session.flow.steps.find((s) => s.id === session.currentStepId);
  if (!currentStep) {
    res.json({ advanced: false });
    return;
  }

  const detectedStepId = await detectIntent(page, 'page_view', session.flow.steps).catch(() => null);
  if (!detectedStepId || detectedStepId === session.currentStepId) {
    res.json({ advanced: false });
    return;
  }

  const detectedStep = session.flow.steps.find((s) => s.id === detectedStepId);
  // Only advance, never go backwards
  if (!detectedStep || detectedStep.order <= currentStep.order) {
    res.json({ advanced: false });
    return;
  }

  await prisma.userOnboardingSession.update({
    where: { id: session.id },
    data: { currentStepId: detectedStepId, lastActiveAt: new Date() },
  });

  res.json({ advanced: true, newStepId: detectedStepId, newStepTitle: detectedStep.title });
});

// ─── POST /api/v1/session/event ───────────────────────────────────────────────
// Widget fires this when a completion event occurs (e.g. "data_connected")
// If the current step has a matching completionEvent, auto-advance
router.post('/event', async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, eventType } = req.body as { sessionId: string; eventType: string };

  if (!sessionId || !eventType) {
    res.status(400).json({ error: 'sessionId and eventType required' });
    return;
  }

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


  res.json({ advanced: true, nextStep: nextStep ?? null, milestone: isMilestone });
});

export default router;
