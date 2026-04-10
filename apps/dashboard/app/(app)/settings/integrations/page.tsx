'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, IntegrationConfig } from '@/lib/api';

// ─── Integration definitions ──────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    type: 'segment',
    name: 'Segment',
    logo: 'S',
    logoColor: 'bg-green-500',
    description: 'Send onboarding events to Segment. They flow to any downstream tool — Amplitude, BigQuery, Braze, and 300+ more.',
    docUrl: 'https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/',
    fields: [{ key: 'writeKey', label: 'Write Key', placeholder: 'aBcDeFgHiJkLmN...', type: 'password' }],
    eventsDescription: 'Step Completed, Onboarding Completed',
  },
  {
    type: 'mixpanel',
    name: 'Mixpanel',
    logo: 'M',
    logoColor: 'bg-purple-500',
    description: 'Fire events directly into Mixpanel. See exactly where users drop off in your onboarding funnel alongside your other product metrics.',
    docUrl: 'https://developer.mixpanel.com/reference/track-event',
    fields: [{ key: 'token', label: 'Project Token', placeholder: 'a1b2c3d4e5f6...', type: 'password' }],
    eventsDescription: 'Step Completed, Onboarding Completed',
  },
  {
    type: 'hubspot',
    name: 'HubSpot',
    logo: 'H',
    logoColor: 'bg-orange-500',
    description: 'Update contact properties in HubSpot when users complete onboarding steps. Keep your CRM in sync with activation data.',
    docUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
    fields: [{ key: 'apiKey', label: 'Private App Token', placeholder: 'pat-na1-...', type: 'password' }],
    eventsDescription: 'Contact properties updated on each step',
  },
  {
    type: 'webhook',
    name: 'Custom Webhook',
    logo: '⚡',
    logoColor: 'bg-slate-700',
    description: 'POST onboarding events to any URL. Use this to connect Zapier, Make, your own data pipeline, or any custom integration.',
    docUrl: null,
    fields: [{ key: 'url', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/...', type: 'url' }],
    eventsDescription: 'Step Completed, Onboarding Completed',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string } | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.integrations.list();
      const map: Record<string, IntegrationConfig> = {};
      for (const c of res.integrations) {
        map[c.type] = c;
        // Pre-fill drafts with masked credentials
        setDrafts((prev) => ({ ...prev, [c.type]: c.credentials }));
      }
      setConfigs(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (type: string) => {
    setSaving((p) => ({ ...p, [type]: true }));
    setTestResult((p) => ({ ...p, [type]: null }));
    try {
      const credentials = drafts[type] ?? {};
      await api.integrations.upsert(type, { credentials, enabled: true });
      await load();
    } finally {
      setSaving((p) => ({ ...p, [type]: false }));
    }
  };

  const handleTest = async (type: string) => {
    setTesting((p) => ({ ...p, [type]: true }));
    setTestResult((p) => ({ ...p, [type]: null }));
    try {
      // Save first if there are unsaved changes with real values (not masked)
      const draft = drafts[type] ?? {};
      const hasRealValues = Object.values(draft).some((v) => v && !v.includes('•'));
      if (hasRealValues) {
        await api.integrations.upsert(type, { credentials: draft, enabled: true });
      }
      const result = await api.integrations.test(type);
      setTestResult((p) => ({ ...p, [type]: result }));
    } finally {
      setTesting((p) => ({ ...p, [type]: false }));
    }
  };

  const handleToggle = async (type: string, enabled: boolean) => {
    await api.integrations.toggle(type, enabled);
    setConfigs((p) => p[type] ? { ...p, [type]: { ...p[type], enabled } } : p);
  };

  const handleDelete = async (type: string) => {
    if (!confirm('Remove this integration? Onboarding events will stop being sent.')) return;
    await api.integrations.remove(type);
    setConfigs((p) => { const n = { ...p }; delete n[type]; return n; });
    setDrafts((p) => { const n = { ...p }; delete n[type]; return n; });
    setTestResult((p) => ({ ...p, [type]: null }));
  };

  const setDraft = (type: string, key: string, value: string) => {
    setDrafts((p) => ({ ...p, [type]: { ...(p[type] ?? {}), [key]: value } }));
  };

  function timeAgo(iso: string | null | undefined): string {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 text-sm mt-1">
          Send onboarding events to your analytics tools, CRM, and data pipelines automatically.
          Every step completion fires in real time.
        </p>
      </div>

      {/* How it works banner */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 flex gap-3 text-sm">
        <span className="text-brand-500 text-lg shrink-0">⚡</span>
        <div>
          <p className="font-medium text-brand-800">Events fire automatically</p>
          <p className="text-brand-600 text-xs mt-0.5">
            When a user completes an onboarding step, OnboardAI sends a <code className="bg-brand-100 px-1 rounded text-xs">Step Completed</code> event
            with the step title, flow name, time spent, and whether AI assisted. No code required.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {INTEGRATIONS.map((integ) => {
            const config = configs[integ.type];
            const connected = !!config;
            const enabled = config?.enabled ?? false;
            const draft = drafts[integ.type] ?? {};
            const result = testResult[integ.type];

            return (
              <div
                key={integ.type}
                className={`bg-white rounded-xl border transition-colors ${
                  connected && enabled ? 'border-green-200' : 'border-slate-200'
                } p-6`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${integ.logoColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {integ.logo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm">{integ.name}</h3>
                        {connected && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            enabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {enabled ? 'Active' : 'Paused'}
                          </span>
                        )}
                      </div>
                      {connected && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Last fired: {timeAgo(config.lastFiredAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {connected && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(integ.type, !enabled)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          enabled
                            ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {enabled ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDelete(integ.type)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{integ.description}</p>

                {/* Credential fields */}
                <div className="space-y-3 mb-4">
                  {integ.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}</label>
                      <input
                        type={field.type === 'password' ? 'text' : field.type}
                        value={draft[field.key] ?? ''}
                        onChange={(e) => setDraft(integ.type, field.key, e.target.value)}
                        onFocus={(e) => {
                          // Clear masked value on focus so user can type fresh
                          if (e.target.value.includes('•')) setDraft(integ.type, field.key, '');
                        }}
                        placeholder={field.placeholder}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>

                {/* Events description */}
                <p className="text-xs text-slate-400 mb-4">
                  Events sent: <span className="text-slate-600 font-medium">{integ.eventsDescription}</span>
                </p>

                {/* Test result */}
                {result && (
                  <div className={`flex items-start gap-2 text-xs p-3 rounded-lg mb-3 ${
                    result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    <span>{result.success ? '✓' : '✗'}</span>
                    <span>{result.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(integ.type)}
                    disabled={saving[integ.type]}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {saving[integ.type] ? 'Saving…' : connected ? 'Update' : 'Connect'}
                  </button>
                  {connected && (
                    <button
                      onClick={() => handleTest(integ.type)}
                      disabled={testing[integ.type]}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      {testing[integ.type] ? 'Testing…' : 'Test connection'}
                    </button>
                  )}
                  {integ.docUrl && (
                    <a
                      href={integ.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-medium transition-colors"
                    >
                      Docs ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event payload reference */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Event Payload Reference</h2>
        <p className="text-xs text-slate-500 mb-3">Every event includes these properties:</p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed">
{`{
  "userId":      "user_123",          // your user's external ID
  "event":       "Step Completed",    // or "Onboarding Completed"
  "timestamp":   "2026-04-09T12:00Z",
  "source":      "onboardai",
  "properties": {
    "stepTitle":  "Connect your data source",
    "stepOrder":  1,
    "flowName":   "Analytics SaaS Onboarding",
    "isMilestone": false,
    "aiAssisted": true,
    "timeSpentMs": 45200
  }
}`}
        </pre>
      </div>
    </div>
  );
}
