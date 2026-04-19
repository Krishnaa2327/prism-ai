import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = 'Prism <hello@useprism.ai>';
const DASHBOARD_URL = process.env.FRONTEND_URL ?? 'https://app.useprism.ai';

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  orgName: string;
  apiKey: string;
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const snippet = `<!-- Prism Widget -->
<script src="https://cdn.useprism.ai/widget.js"></script>
<script>
  Prism('init', {
    apiKey: '${params.apiKey}',
    userId: currentUser.id,
    metadata: { plan: currentUser.plan },
  });
</script>`;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Welcome to Prism — here's your API key`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#6366f1;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Prism</h1>
            <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">AI-guided onboarding that converts</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#1e293b;font-size:16px;">Hi ${params.name},</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              Welcome to Prism! Your account for <strong>${params.orgName}</strong> is ready.
              Paste the snippet below into your app and the AI agent will start guiding users to first value.
            </p>

            <!-- API Key box -->
            <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your API Key</p>
              <code style="color:#6366f1;font-size:13px;font-family:monospace;word-break:break-all;">${params.apiKey}</code>
            </div>

            <!-- Snippet box -->
            <p style="margin:0 0 10px;color:#1e293b;font-size:14px;font-weight:600;">Embed snippet</p>
            <div style="background:#0f172a;border-radius:8px;padding:16px 20px;margin-bottom:28px;overflow:hidden;">
              <pre style="margin:0;color:#e2e8f0;font-size:12px;font-family:monospace;white-space:pre-wrap;line-height:1.6;">${snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>

            <!-- Steps -->
            <p style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:600;">Get started in 3 steps</p>
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              ${['Paste the snippet before </body> on every page', 'Replace <code>currentUser.id</code> with your user\'s ID', 'Open your app — the AI widget appears after 30 seconds'].map((text, i) => `
              <tr>
                <td style="padding:6px 0;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;height:28px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;">
                        <span style="color:#6366f1;font-size:12px;font-weight:700;">${i + 1}</span>
                      </td>
                      <td style="padding-left:12px;color:#475569;font-size:14px;">${text}</td>
                    </tr>
                  </table>
                </td>
              </tr>`).join('')}
            </table>

            <!-- CTA -->
            <a href="${DASHBOARD_URL}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              Open Dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Questions? Reply to this email — we read every one.<br>
              Prism · AI-guided onboarding
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendContactEmail(params: {
  name: string;
  email: string;
  company?: string;
  useCase?: string;
  message: string;
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping contact email');
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: 'hello@useprism.ai',
    replyTo: params.email,
    subject: `Contact: ${params.name}${params.company ? ` (${params.company})` : ''}`,
    html: `
<p><strong>From:</strong> ${params.name} &lt;${params.email}&gt;</p>
${params.company ? `<p><strong>Company:</strong> ${params.company}</p>` : ''}
${params.useCase ? `<p><strong>Use case:</strong> ${params.useCase}</p>` : ''}
<p><strong>Message:</strong></p>
<p style="white-space:pre-wrap">${params.message}</p>`,
  });
}

export async function sendZeroCompletionAlert(params: {
  to: string;
  orgName: string;
  flowName: string;
  sessionsToday: number;
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping zero-completion alert');
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Alert: "${params.flowName}" has had 0 completions today`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#f97316;padding:24px 36px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">⚠️ Flow alert — ${params.orgName}</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6;">
              Your flow <strong>"${params.flowName}"</strong> had
              <strong>${params.sessionsToday} session${params.sessionsToday === 1 ? '' : 's'} started</strong>
              in the last 24 hours but <strong style="color:#ef4444;">0 completions</strong>.
            </p>
            <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.6;">
              This usually means users are getting stuck or the AI isn't responding correctly.
              Check the failure inbox for stuck sessions and open escalations.
            </p>

            <!-- Stats row -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;background:#fef9f0;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;">
              <tr>
                <td style="text-align:center;border-right:1px solid #fed7aa;padding-right:20px;">
                  <p style="margin:0;color:#ea580c;font-size:28px;font-weight:700;">${params.sessionsToday}</p>
                  <p style="margin:4px 0 0;color:#9a3412;font-size:12px;">Sessions started</p>
                </td>
                <td style="text-align:center;padding-left:20px;">
                  <p style="margin:0;color:#ef4444;font-size:28px;font-weight:700;">0%</p>
                  <p style="margin:4px 0 0;color:#9a3412;font-size:12px;">Completion rate</p>
                </td>
              </tr>
            </table>

            <div style="display:flex;gap:12px;">
              <a href="${DASHBOARD_URL}/failures" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;margin-right:12px;">
                View failure inbox →
              </a>
              <a href="${DASHBOARD_URL}/flows" style="display:inline-block;background:#f1f5f9;color:#475569;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #e2e8f0;">
                Review flow
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 36px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              Prism · You'll only receive this alert once per flow per 24 hours.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
