'use client';
import { useEffect, useState } from 'react';
import { api, AlertConfig } from '@/lib/api';

export default function AlertSettingsPage() {
  const [config, setConfig] = useState<AlertConfig>({ selectorAlertEnabled: false, selectorAlertWebhook: null });
  const [webhook, setWebhook] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.alertConfig.get().then((c) => {
      setConfig(c);
      setWebhook(c.selectorAlertWebhook ?? '');
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.alertConfig.update({
        selectorAlertEnabled: config.selectorAlertEnabled,
        selectorAlertWebhook: webhook.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-200 rounded-xl" /><div className="h-24 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Broken Flow Alerts</h1>
        <p className="text-slate-500 text-sm mt-1">
          Get notified the first time a CSS selector fails completely — before users notice.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
        <p className="text-sm font-semibold text-slate-700">How it works</p>
        <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
          <li>The self-healing engine tries 7 fallback strategies before giving up on a selector.</li>
          <li>When all fallbacks fail (action silently dropped), an alert fires <strong>once per selector per 24 hours</strong>.</li>
          <li>You'll receive the broken selector, affected step, and a link to Flow Health to fix it.</li>
        </ul>
      </div>

      {/* Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Enable broken-selector alerts</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Sends email to the org owner + Slack (if webhook configured below).
            </p>
          </div>
          <button
            onClick={() => setConfig((c) => ({ ...c, selectorAlertEnabled: !c.selectorAlertEnabled }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
              config.selectorAlertEnabled ? 'bg-brand-600' : 'bg-slate-200'
            }`}
            role="switch"
            aria-checked={config.selectorAlertEnabled}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                config.selectorAlertEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Slack webhook */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Slack webhook URL <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          />
          <p className="text-xs text-slate-400 mt-1">
            Create an Incoming Webhook in your Slack workspace settings and paste the URL here.
          </p>
        </div>

        {/* Email note */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <p className="text-xs text-blue-700">
            <strong>Email alerts</strong> are automatically sent to the org owner's address.
            No additional setup needed — just enable alerts above.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Link to flow health */}
      <div className="border-t border-slate-100 pt-6">
        <p className="text-xs text-slate-400">
          View all broken selectors in real time →{' '}
          <a href="/flows/health" className="text-brand-600 hover:underline">Flow Health</a>
        </p>
      </div>
    </div>
  );
}
