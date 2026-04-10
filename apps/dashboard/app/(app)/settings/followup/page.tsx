'use client';
import { useEffect, useState } from 'react';
import { api, FollowUpConfig } from '@/lib/api';

const DEFAULTS: FollowUpConfig = {
  emailEnabled: false,
  slackWebhookUrl: null,
  whatsappEnabled: false,
  twilioAccountSid: null,
  twilioAuthToken: null,
  twilioFromNumber: null,
  followUpDelayMins: 30,
  emailSubject: 'Still need help?',
  emailBody: 'Hi! You were setting things up earlier. Want to pick up where you left off?',
};

export default function FollowUpSettingsPage() {
  const [config, setConfig] = useState<FollowUpConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.followup.getConfig().then(setConfig).catch(() => null).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.followup.saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof FollowUpConfig>(key: K, value: FollowUpConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="animate-pulse h-60 bg-slate-100 rounded-xl" />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Follow-up Channels</h1>
        <p className="text-slate-500 text-sm mt-1">
          Automatically reach out when a user drops off. Fires on exit intent, rage clicks, or form abandonment.
        </p>
      </div>

      <div className="space-y-5">
        {/* Timing */}
        <Card title="Timing">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Trigger delay (minutes after drop-off)
            </label>
            <input
              type="number"
              min={1}
              max={10080}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:border-brand-400"
              value={config.followUpDelayMins}
              onChange={(e) => set('followUpDelayMins', Number(e.target.value))}
            />
            <p className="text-xs text-slate-400 mt-1">Set to 0 for immediate. Max 10080 (7 days).</p>
          </div>
        </Card>

        {/* Email */}
        <Card title="Email">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config.emailEnabled}
              onChange={(e) => set('emailEnabled', e.target.checked)}
            />
            Enable email follow-up
          </label>
          {config.emailEnabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject line</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  value={config.emailSubject}
                  onChange={(e) => set('emailSubject', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email body</label>
                <textarea
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none"
                  value={config.emailBody}
                  onChange={(e) => set('emailBody', e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-400">
                Sent from your OnboardAI account. Requires that the user's email is passed in widget metadata.
              </p>
            </div>
          )}
        </Card>

        {/* Slack */}
        <Card title="Slack">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Slack incoming webhook URL
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-400"
              placeholder="https://hooks.slack.com/services/..."
              value={config.slackWebhookUrl ?? ''}
              onChange={(e) => set('slackWebhookUrl', e.target.value || null)}
            />
            <p className="text-xs text-slate-400 mt-1">
              When set, posts a drop-off alert to your Slack channel. Leave blank to disable.
            </p>
          </div>
        </Card>

        {/* WhatsApp / Twilio */}
        <Card title="WhatsApp (via Twilio)">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config.whatsappEnabled}
              onChange={(e) => set('whatsappEnabled', e.target.checked)}
            />
            Enable WhatsApp follow-up
          </label>
          {config.whatsappEnabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Twilio Account SID</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-400"
                  placeholder="AC..."
                  value={config.twilioAccountSid ?? ''}
                  onChange={(e) => set('twilioAccountSid', e.target.value || null)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Twilio Auth Token</label>
                <input
                  type="password"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-400"
                  placeholder={config.twilioAuthToken === '••••••••' ? 'Saved (enter new to change)' : 'Paste token'}
                  onChange={(e) => set('twilioAuthToken', e.target.value || null)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  From number (WhatsApp Business number)
                </label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-400"
                  placeholder="+14155238886"
                  value={config.twilioFromNumber ?? ''}
                  onChange={(e) => set('twilioFromNumber', e.target.value || null)}
                />
              </div>
              <p className="text-xs text-slate-400">
                Requires the user's phone to be passed as <code>metadata.phone</code> in the widget init call.
              </p>
            </div>
          )}
        </Card>

        {/* Save */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}
