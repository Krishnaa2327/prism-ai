/**
 * Integration Engine — Phase 2
 *
 * Fires onboarding events to connected tools (Segment, Mixpanel, HubSpot, Webhook).
 * Called whenever a user completes a step or reaches a milestone.
 */

import { prisma } from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntegrationEvent {
  orgId: string;
  userId: string; // end-user's external ID (from widget init)
  event: string;  // e.g. "Step Completed" | "Milestone Reached" | "Onboarding Completed"
  properties: Record<string, unknown>;
}

export type IntegrationType = 'segment' | 'mixpanel' | 'hubspot' | 'webhook';

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export async function fireIntegrationEvents(opts: IntegrationEvent): Promise<void> {
  const { orgId, userId, event, properties } = opts;

  const integrations = await prisma.integrationConfig.findMany({
    where: { organizationId: orgId, enabled: true },
  });

  if (integrations.length === 0) return;

  const timestamp = new Date().toISOString();

  // Fire all integrations in parallel — failures are swallowed (don't break onboarding)
  await Promise.allSettled(
    integrations.map(async (integration) => {
      const creds = integration.credentials as Record<string, string>;

      try {
        switch (integration.type as IntegrationType) {
          case 'segment':
            await fireSegment(creds.writeKey, userId, event, properties, timestamp);
            break;
          case 'mixpanel':
            await fireMixpanel(creds.token, userId, event, properties, timestamp);
            break;
          case 'hubspot':
            await fireHubspot(creds.apiKey, userId, event, properties);
            break;
          case 'webhook':
            await fireWebhook(creds.url, userId, event, properties, timestamp);
            break;
        }

        await prisma.integrationConfig.update({
          where: { id: integration.id },
          data: { lastFiredAt: new Date() },
        });
      } catch {
        // Silently swallow — integration errors must never interrupt onboarding
      }
    })
  );
}

// ─── Test a connection (returns success + message) ────────────────────────────

export async function testIntegration(
  type: IntegrationType,
  credentials: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  try {
    switch (type) {
      case 'segment': {
        if (!credentials.writeKey) return { success: false, message: 'Write key required' };
        const auth = Buffer.from(`${credentials.writeKey}:`).toString('base64');
        const res = await fetch('https://api.segment.io/v1/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
          body: JSON.stringify({ userId: 'onboardai_test', traits: { source: 'onboardai_test' } }),
          signal: AbortSignal.timeout(5000),
        });
        return res.ok
          ? { success: true, message: 'Segment connected — test identify sent' }
          : { success: false, message: `Segment returned ${res.status}` };
      }

      case 'mixpanel': {
        if (!credentials.token) return { success: false, message: 'Project token required' };
        const data = { event: '$identify', properties: { distinct_id: 'onboardai_test', token: credentials.token } };
        const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
        const res = await fetch(
          `https://api.mixpanel.com/track?data=${encodeURIComponent(encoded)}&verbose=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        return body.status === 1
          ? { success: true, message: 'Mixpanel connected — test event sent' }
          : { success: false, message: `Mixpanel returned: ${body.error ?? 'unknown error'}` };
      }

      case 'hubspot': {
        if (!credentials.apiKey) return { success: false, message: 'Private app token required' };
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
          headers: { Authorization: `Bearer ${credentials.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok
          ? { success: true, message: 'HubSpot connected — API token valid' }
          : { success: false, message: `HubSpot returned ${res.status} — check your private app token` };
      }

      case 'webhook': {
        if (!credentials.url) return { success: false, message: 'Webhook URL required' };
        const res = await fetch(credentials.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, source: 'onboardai', timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(5000),
        });
        return res.ok
          ? { success: true, message: `Webhook responded with ${res.status}` }
          : { success: false, message: `Webhook returned ${res.status}` };
      }

      default:
        return { success: false, message: 'Unknown integration type' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return { success: false, message };
  }
}

// ─── Individual integration fire functions ────────────────────────────────────

async function fireSegment(
  writeKey: string,
  userId: string,
  event: string,
  properties: Record<string, unknown>,
  timestamp: string
) {
  if (!writeKey) return;
  const auth = Buffer.from(`${writeKey}:`).toString('base64');
  await fetch('https://api.segment.io/v1/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ userId, event, properties: { ...properties, source: 'onboardai' }, timestamp }),
    signal: AbortSignal.timeout(8000),
  });
}

async function fireMixpanel(
  token: string,
  userId: string,
  event: string,
  properties: Record<string, unknown>,
  timestamp: string
) {
  if (!token) return;
  const data = {
    event,
    properties: {
      distinct_id: userId,
      token,
      time: Math.floor(new Date(timestamp).getTime() / 1000),
      ...properties,
      source: 'onboardai',
    },
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
  await fetch(`https://api.mixpanel.com/track?data=${encodeURIComponent(encoded)}`, {
    method: 'GET',
    signal: AbortSignal.timeout(8000),
  });
}

async function fireHubspot(
  apiKey: string,
  userId: string,
  event: string,
  properties: Record<string, unknown>
) {
  if (!apiKey) return;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userId);
  const contactProps: Record<string, string> = {
    last_onboarding_event: event,
    last_onboarding_event_at: new Date().toISOString(),
  };
  if (properties.stepTitle) contactProps['last_completed_onboarding_step'] = String(properties.stepTitle);
  if (properties.flowName) contactProps['onboarding_flow'] = String(properties.flowName);

  if (isEmail) {
    // Upsert contact by email
    await fetch(`https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        properties: Object.entries(contactProps).map(([property, value]) => ({ property, value })),
      }),
      signal: AbortSignal.timeout(8000),
    });
  }
}

async function fireWebhook(
  url: string,
  userId: string,
  event: string,
  properties: Record<string, unknown>,
  timestamp: string
) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, event, properties, timestamp, source: 'onboardai' }),
    signal: AbortSignal.timeout(8000),
  });
}
