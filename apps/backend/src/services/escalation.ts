// ─── Escalation Service ───────────────────────────────────────────────────────
// Creates escalation tickets and notifies the support team via email + Slack.

import { Resend } from 'resend';
import { prisma } from '../lib/prisma';

const DASHBOARD_URL = process.env.FRONTEND_URL ?? 'https://app.useprism.ai';

export interface EscalationContext {
  userId: string | null;
  userMetadata: Record<string, unknown>;
  flowName: string;
  stepTitle: string;
  collectedData: Record<string, unknown>;
  recentMessages: Array<{ role: string; content: string }>;
}

export async function createEscalationTicket(params: {
  organizationId: string;
  endUserId: string;
  sessionId: string;
  stepId: string | null;
  trigger: 'agent_detected' | 'user_requested';
  reason: string;
  agentMessage: string;
  context: EscalationContext;
}) {
  return prisma.escalationTicket.create({
    data: {
      organizationId: params.organizationId,
      endUserId: params.endUserId,
      sessionId: params.sessionId,
      stepId: params.stepId,
      trigger: params.trigger,
      status: 'open',
      reason: params.reason,
      agentMessage: params.agentMessage,
      context: params.context as object,
    },
  });
}

export async function notifyTeam(params: {
  orgId: string;
  orgName: string;
  ticketId: string;
  context: EscalationContext;
  reason: string;
}) {
  const { orgId, orgName, ticketId, context, reason } = params;

  // Get org owner email + follow-up config (for Slack webhook)
  const [owner, followUpConfig] = await Promise.all([
    prisma.user.findFirst({
      where: { organizationId: orgId, role: 'owner' },
      select: { email: true },
    }),
    prisma.followUpConfig.findUnique({
      where: { organizationId: orgId },
      select: { slackWebhookUrl: true },
    }),
  ]);

  const ticketUrl = `${DASHBOARD_URL}/escalations/${ticketId}`;
  const userLabel = context.userId ?? 'anonymous';

  const tasks: Promise<unknown>[] = [];

  // ── Email to owner ────────────────────────────────────────────────────────
  if (owner?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const recentConvo = context.recentMessages.slice(-4)
      .map((m) => `<tr><td style="padding:4px 0;color:${m.role === 'user' ? '#1e293b' : '#6366f1'};font-size:13px;"><strong>${m.role === 'user' ? 'User' : 'AI'}:</strong> ${m.content}</td></tr>`)
      .join('');
    const dataRows = Object.entries(context.collectedData)
      .map(([k, v]) => `<tr><td style="color:#64748b;font-size:12px;padding:2px 8px 2px 0">${k}</td><td style="color:#1e293b;font-size:12px;">${v}</td></tr>`)
      .join('');

    tasks.push(resend.emails.send({
      from: `Prism <hello@useprism.ai>`,
      to: owner.email,
      subject: `[${orgName}] Human escalation — ${context.stepTitle}`,
      html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 20px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#ef4444;padding:20px 32px;">
    <span style="color:#fff;font-size:16px;font-weight:700;">🚨 Human escalation requested</span>
    <p style="color:#fecaca;margin:4px 0 0;font-size:13px;">${orgName} · ${context.flowName} → ${context.stepTitle}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Why escalated</p>
    <p style="margin:0 0 20px;font-size:14px;color:#1e293b;">${reason}</p>

    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">User</p>
    <p style="margin:0 0 20px;font-size:14px;color:#1e293b;">${userLabel}</p>

    ${dataRows ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Collected data</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:12px 16px;width:100%;border:1px solid #e2e8f0;">${dataRows}</table>
    ` : ''}

    ${recentConvo ? `
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Recent conversation</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">${recentConvo}</table>
    ` : ''}

    <a href="${ticketUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;">
      View ticket & resolve →
    </a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">Ticket #${ticketId.slice(0, 8)} · Powered by Prism</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    }).catch((e) => console.error('[escalation] email failed:', e)));
  }

  // ── Slack notification ────────────────────────────────────────────────────
  if (followUpConfig?.slackWebhookUrl) {
    const dataStr = Object.entries(context.collectedData)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    tasks.push(fetch(followUpConfig.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Human escalation* — ${orgName}`,
        attachments: [{
          color: '#ef4444',
          fields: [
            { title: 'User', value: userLabel, short: true },
            { title: 'Step', value: `${context.flowName} → ${context.stepTitle}`, short: true },
            { title: 'Reason', value: reason, short: false },
            ...(dataStr ? [{ title: 'Collected data', value: dataStr, short: false }] : []),
          ],
          actions: [{ type: 'button', text: 'View ticket', url: ticketUrl }],
        }],
      }),
    }).catch((e) => console.error('[escalation] slack failed:', e)));
  }

  await Promise.allSettled(tasks);
}
