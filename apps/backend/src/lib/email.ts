import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = 'OnboardAI <hello@onboardai.com>';
const DASHBOARD_URL = process.env.FRONTEND_URL ?? 'https://app.onboardai.com';

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

  const snippet = `<!-- OnboardAI Widget -->
<script src="https://cdn.onboardai.com/widget.js"></script>
<script>
  OnboardAI('init', {
    apiKey: '${params.apiKey}',
    userId: currentUser.id,
    metadata: { plan: currentUser.plan },
  });
</script>`;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Welcome to OnboardAI — here's your API key`,
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
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">OnboardAI</h1>
            <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">AI-powered onboarding for SaaS</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#1e293b;font-size:16px;">Hi ${params.name},</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              Welcome to OnboardAI! Your account for <strong>${params.orgName}</strong> is ready.
              Paste the snippet below into your app and the AI widget will start catching drop-offs.
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
              ${['Paste the snippet before </body> on every page', 'Replace <code>currentUser.id</code> with your user\'s ID', 'Open your app — wait 30 seconds — the AI bubble appears'].map((text, i) => `
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
              OnboardAI · Made with ♥ by two CS students
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
