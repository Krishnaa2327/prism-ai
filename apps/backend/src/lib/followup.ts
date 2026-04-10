// Multi-channel follow-up: Email (Resend) · Slack (webhook) · WhatsApp (Twilio)
// Called when a drop-off event fires and the user hasn't resolved their conversation.

import { Resend } from 'resend';
import { FollowUpConfig } from '@prisma/client';

// ─── Email ────────────────────────────────────────────────────────────────────

export async function sendFollowUpEmail(
  config: FollowUpConfig,
  to: string,
  orgName: string
) {
  if (!config.emailEnabled) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[followup] RESEND_API_KEY not set — skipping email follow-up');
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: `${orgName} <hello@onboardai.com>`,
    to,
    subject: config.emailSubject,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;">
        <p style="color:#1e293b;font-size:15px;line-height:1.6;">${config.emailBody}</p>
        <a href="${process.env.FRONTEND_URL ?? 'https://app.onboardai.com'}"
           style="display:inline-block;margin-top:20px;background:#6366f1;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
          Continue where you left off →
        </a>
        <p style="color:#94a3b8;font-size:11px;margin-top:24px;">Powered by OnboardAI</p>
      </div>
    `,
  });
}

// ─── Slack ────────────────────────────────────────────────────────────────────

export async function sendFollowUpSlack(config: FollowUpConfig, message: string) {
  if (!config.slackWebhookUrl) return;

  await fetch(config.slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}

// ─── WhatsApp (Twilio) ────────────────────────────────────────────────────────

export async function sendFollowUpWhatsApp(
  config: FollowUpConfig,
  toNumber: string, // E.164 format: +1234567890
  message: string
) {
  if (!config.whatsappEnabled) return;
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
    console.warn('[followup] Twilio credentials not configured — skipping WhatsApp follow-up');
    return;
  }

  const from = `whatsapp:${config.twilioFromNumber}`;
  const to = `whatsapp:${toNumber}`;
  const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
    }
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Called after a drop-off event. Fires all enabled channels concurrently.

export async function triggerFollowUp(params: {
  config: FollowUpConfig;
  orgName: string;
  userEmail?: string;
  userPhone?: string;
  slackMessage?: string;
}) {
  const { config, orgName, userEmail, userPhone, slackMessage } = params;

  const tasks: Promise<void>[] = [];

  if (config.emailEnabled && userEmail) {
    tasks.push(
      sendFollowUpEmail(config, userEmail, orgName).catch((e) =>
        console.error('[followup] email failed:', e)
      )
    );
  }

  if (config.slackWebhookUrl && slackMessage) {
    tasks.push(
      sendFollowUpSlack(config, slackMessage).catch((e) =>
        console.error('[followup] slack failed:', e)
      )
    );
  }

  if (config.whatsappEnabled && userPhone) {
    tasks.push(
      sendFollowUpWhatsApp(config, userPhone, config.emailBody).catch((e) =>
        console.error('[followup] whatsapp failed:', e)
      )
    );
  }

  await Promise.allSettled(tasks);
}
