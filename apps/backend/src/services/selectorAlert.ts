// ─── Broken-selector alert notifications ─────────────────────────────────────
// Fires once per broken selector per 24-hour window.
// Channels: Slack webhook (if configured) + email to org owner (if RESEND_API_KEY set).

import { Resend } from 'resend';
import { prisma } from '../lib/prisma';

const DASHBOARD_URL = process.env.FRONTEND_URL ?? 'https://app.onboardai.com';

export interface SelectorAlertParams {
  organizationId: string;
  originalSelector: string;
  page: string;
  stepTitle?: string | null;
  flowName?: string | null;
}

export async function fireSelectorAlert(params: SelectorAlertParams): Promise<void> {
  const { organizationId, originalSelector, page, stepTitle, flowName } = params;

  // Fetch org name + owner email + alert config
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      selectorAlertEnabled: true,
      selectorAlertWebhook: true,
      users: {
        where: { role: 'owner' },
        select: { email: true },
        take: 1,
      },
    },
  });

  if (!org?.selectorAlertEnabled) return;

  const ownerEmail = org.users[0]?.email ?? null;
  const healthUrl = `${DASHBOARD_URL}/flows/health`;
  const stepLabel = stepTitle && flowName ? `${flowName} → ${stepTitle}` : stepTitle ?? 'Unknown step';
  const tasks: Promise<unknown>[] = [];

  // ── Slack ──────────────────────────────────────────────────────────────────
  if (org.selectorAlertWebhook) {
    tasks.push(
      fetch(org.selectorAlertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ *Broken selector detected* — ${org.name}`,
          attachments: [
            {
              color: '#ef4444',
              fields: [
                { title: 'Selector',  value: `\`${originalSelector}\``, short: false },
                { title: 'Step',      value: stepLabel,                 short: true  },
                { title: 'Page',      value: page,                      short: true  },
              ],
              footer: 'OnboardAI · Flow Health',
              actions: [{ type: 'button', text: 'View Flow Health →', url: healthUrl }],
            },
          ],
        }),
      }).catch((e) => console.error('[alert] Slack failed:', e))
    );
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  if (ownerEmail && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    tasks.push(
      resend.emails.send({
        from: 'OnboardAI <hello@onboardai.com>',
        to: ownerEmail,
        subject: `[${org.name}] Broken selector detected — action needed`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 20px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#ef4444;padding:20px 32px;">
    <span style="color:#fff;font-size:16px;font-weight:700;">⚠️ Broken selector detected</span>
    <p style="color:#fecaca;margin:4px 0 0;font-size:13px;">${org.name}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Selector</p>
    <p style="margin:0 0 20px;font-size:13px;color:#1e293b;background:#f1f5f9;padding:8px 12px;border-radius:6px;font-family:monospace;">${originalSelector}</p>

    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Step</p>
    <p style="margin:0 0 20px;font-size:14px;color:#1e293b;">${stepLabel}</p>

    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Page</p>
    <p style="margin:0 0 24px;font-size:14px;color:#1e293b;">${page}</p>

    <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
      This selector could not be resolved even with fallback strategies — the action is being silently dropped.
      Add a <code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;">data-testid</code> attribute to the element or update the selector in your step editor.
    </p>

    <a href="${healthUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;">
      View Flow Health →
    </a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">Powered by OnboardAI · <a href="${healthUrl}" style="color:#94a3b8;">Manage alerts</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
      }).catch((e) => console.error('[alert] email failed:', e))
    );
  }

  await Promise.allSettled(tasks);
}
