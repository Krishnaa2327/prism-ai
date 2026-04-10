import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── GET /api/v1/onboarding/status ──────────────────────────────────────────
// Returns a checklist of 5 onboarding steps for the org.
// Used by the dashboard home page to guide new customers through setup.
router.get('/status', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const [org, eventCount, conversationCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.event.count({ where: { organizationId: orgId } }),
    prisma.conversation.count({ where: { organizationId: orgId } }),
  ]);

  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const steps = [
    {
      id: 'account_created',
      label: 'Create your account',
      description: 'You\'re signed in and your org is set up.',
      done: true,
    },
    {
      id: 'widget_installed',
      label: 'Install the widget',
      description: 'Paste the embed snippet before </body> in your app.',
      done: eventCount > 0,
    },
    {
      id: 'first_conversation',
      label: 'See your first conversation',
      description: 'Wait for a user to idle 30s — the AI will kick in.',
      done: conversationCount > 0,
    },
    {
      id: 'ai_customized',
      label: 'Customize the AI',
      description: 'Add custom instructions so the AI knows your product.',
      done: !!org.customInstructions,
    },
    {
      id: 'upgraded',
      label: 'Upgrade to a paid plan',
      description: 'Unlock more conversations and priority support.',
      done: org.planType !== 'free',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  res.json({
    steps,
    completedCount,
    totalCount: steps.length,
    allDone: completedCount === steps.length,
  });
});

export default router;
