// ─── Flow alerting service ───────────────────────────────────────────────────
// Checks all orgs for active flows with 0% completion rate in the last 24h.
// Fires once per flow per 24h (deduped in-memory — acceptable for a single-
// instance Railway deploy; a DB flag would be needed for multi-instance).

import { prisma } from '../lib/prisma';
import { sendZeroCompletionAlert } from '../lib/email';
import { logger } from '../lib/logger';

// flowId → timestamp of the last alert sent
const lastAlerted = new Map<string, number>();

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 h
const WINDOW_MS        = 24 * 60 * 60 * 1000;  // look-back window

export async function checkFlowAlerts(): Promise<void> {
  logger.info('[alerting] running flow completion check');

  const now   = Date.now();
  const since = new Date(now - WINDOW_MS);

  // All active flows with org info
  const flows = await prisma.onboardingFlow.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });

  for (const flow of flows) {
    // Skip if we already alerted for this flow in the last 24h
    const last = lastAlerted.get(flow.id);
    if (last && now - last < ALERT_COOLDOWN_MS) continue;

    // Count sessions in the window
    const [started, completed] = await Promise.all([
      prisma.userOnboardingSession.count({
        where: { flowId: flow.id, startedAt: { gte: since } },
      }),
      prisma.userOnboardingSession.count({
        where: { flowId: flow.id, startedAt: { gte: since }, status: 'completed' },
      }),
    ]);

    // Only alert when sessions exist but none completed
    if (started === 0 || completed > 0) continue;

    // Fetch org owner email
    const owner = await prisma.user.findFirst({
      where: { organizationId: flow.organizationId, role: 'owner' },
      select: { email: true },
    });

    if (!owner?.email) continue;

    try {
      await sendZeroCompletionAlert({
        to: owner.email,
        orgName: flow.organization.name,
        flowName: flow.name,
        sessionsToday: started,
      });

      lastAlerted.set(flow.id, now);

      logger.info('[alerting] zero-completion alert sent', {
        flowId: flow.id,
        flowName: flow.name,
        orgName: flow.organization.name,
        sessionsToday: started,
        to: owner.email,
      });
    } catch (err) {
      logger.error('[alerting] failed to send alert', { flowId: flow.id, err });
    }
  }

  logger.info('[alerting] check complete', { flowsChecked: flows.length });
}
