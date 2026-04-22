'use client';
import { useEffect, useState } from 'react';
import { api, OrgConfig, AlertConfig, HealEntry } from '@/lib/api';

function buildSnippet(apiKey: string): string {
  const open = String.fromCharCode(60);
  const close = String.fromCharCode(62);
  const slash = String.fromCharCode(47);
  return [
    `${open}script src="https://cdn.useprism.ai/widget.js"`,
    `  data-key="${apiKey}"${close}${open}${slash}script${close}`,
  ].join('\n');
}

function buildFullSnippet(apiKey: string): string {
  const open = String.fromCharCode(60);
  const close = String.fromCharCode(62);
  const slash = String.fromCharCode(47);
  return [
    `${open}!-- Prism AI Widget --${close}`,
    `${open}script src="https://cdn.useprism.ai/widget.js"${close}${open}${slash}script${close}`,
    `${open}script${close}`,
    `  Prism('init', {`,
    `    apiKey: '${apiKey}',`,
    `    userId: currentUser.id,`,
    `    metadata: { plan: currentUser.plan },`,
    `  });`,
    `${open}${slash}script${close}`,
  ].join('\n');
}

export default function WidgetSettingsPage() {
  const [config, setConfig] = useState<OrgConfig | null>(null);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [alertWebhook, setAlertWebhook] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);
  const [healEntries, setHealEntries] = useState<HealEntry[]>([]);

  useEffect(() => {
    api.config.get().then(setConfig);
    api.alertConfig.get().then((ac) => {
      setAlertConfig(ac);
      setAlertWebhook(ac.selectorAlertWebhook ?? '');
    }).catch(() => {});
    api.flowHealth.list().then((r) => setHealEntries(r.entries)).catch(() => {});
  }, []);

  async function saveAlertConfig() {
    setAlertSaving(true);
    try {
      await api.alertConfig.update({
        selectorAlertEnabled: alertConfig?.selectorAlertEnabled ?? false,
        selectorAlertWebhook: alertWebhook || null,
      });
      setAlertSaved(true);
      setTimeout(() => setAlertSaved(false), 2000);
    } finally {
      setAlertSaving(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function rotateKey() {
    if (!confirm('This will invalidate your current API key. Any sites using the old key will stop working immediately. Continue?')) return;
    setRotating(true);
    try {
      const res = await api.config.rotateKey();
      setConfig((prev) => prev ? { ...prev, apiKey: res.apiKey } : prev);
    } finally {
      setRotating(false);
    }
  }

  const snippet = config ? buildSnippet(config.apiKey) : '';
  const fullSnippet = config ? buildFullSnippet(config.apiKey) : '';

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Install in seconds</h1>
        <p className="text-slate-500 text-sm mt-1">
          Add this snippet to your app and your AI assistant goes live instantly.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">

        {/* Step 1 — Snippet */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Add to your app</p>
                <p className="text-xs text-slate-400">Paste before the closing &lt;/body&gt; tag</p>
              </div>
            </div>
            <button
              onClick={() => copy(fullSnippet, 'snippet')}
              disabled={!config}
              className="text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {copied === 'snippet' ? '✓ Copied' : 'Copy snippet'}
            </button>
          </div>
          <div className="bg-slate-900 px-6 py-5">
            {config ? (
              <pre className="text-xs text-slate-100 leading-relaxed overflow-x-auto font-mono whitespace-pre">
                {fullSnippet}
              </pre>
            ) : (
              <div className="h-24 bg-slate-800 rounded animate-pulse" />
            )}
          </div>
        </div>

        {/* Step 2 — API Key */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Your API key</p>
              <p className="text-xs text-slate-400 mb-3">Keep this secret — it identifies your organisation.</p>
              {config ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 font-mono overflow-x-auto">
                    {config.apiKey}
                  </code>
                  <button
                    onClick={() => copy(config.apiKey, 'key')}
                    className="flex-shrink-0 px-3 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {copied === 'key' ? '✓' : 'Copy'}
                  </button>
                </div>
              ) : (
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              )}
              <button
                onClick={rotateKey}
                disabled={rotating || !config}
                className="mt-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
              >
                {rotating ? 'Rotating…' : '↺ Rotate key'}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 — User ID */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Set userId & metadata</p>
              <p className="text-xs text-slate-400 mb-3">
                Pass your user's ID and any context the AI should know about them.
              </p>
              <div className="bg-slate-900 rounded-lg px-4 py-3 text-xs text-slate-100 font-mono leading-relaxed">
                <span className="text-slate-400">// After login:</span>{'\n'}
                {'Prism(\'init\', {\n'}
                {'  apiKey: \'YOUR_KEY\',\n'}
                {'  userId: currentUser.id,      '}
                <span className="text-slate-500">// your DB user ID</span>{'\n'}
                {'  metadata: {\n'}
                {'    plan: currentUser.plan,    '}
                <span className="text-slate-500">// e.g. "free"</span>{'\n'}
                {'    signedUpAt: currentUser.createdAt,\n'}
                {'  },\n'}
                {'});'}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 — Done */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">That's it. Your AI assistant is live.</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Open your app — the widget will appear automatically after 30 seconds of user inactivity.
                Once users start chatting, conversations will appear in your{' '}
                <a href="/conversations" className="underline font-medium">Conversations</a> tab.
              </p>
            </div>
          </div>
        </div>

        {/* Config reference */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Config options</p>
          <table className="w-full text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-2 font-semibold text-slate-700">Option</th>
                <th className="text-left pb-2 font-semibold text-slate-700">Default</th>
                <th className="text-left pb-2 font-semibold text-slate-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { opt: 'apiKey',         def: '—',            desc: 'Required. Your organisation API key.' },
                { opt: 'userId',         def: 'auto',         desc: "Your user's ID. Auto-generated if omitted." },
                { opt: 'metadata',       def: '{}',           desc: 'Extra context for the AI (plan, step, etc.)' },
                { opt: 'idleThreshold',  def: '30000',        desc: 'Ms of inactivity before widget appears.' },
                { opt: 'primaryColor',   def: '#6366f1',      desc: 'Widget accent colour (hex).' },
                { opt: 'position',       def: 'bottom-right', desc: '"bottom-right" or "bottom-left".' },
              ].map(({ opt, def, desc }) => (
                <tr key={opt}>
                  <td className="py-2 pr-4 font-mono text-indigo-700">{opt}</td>
                  <td className="py-2 pr-4 font-mono text-slate-400">{def}</td>
                  <td className="py-2 text-slate-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Selector Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Selector alerts</p>
          <p className="text-xs text-slate-400 mb-4">
            Get notified when a CSS selector Prism relies on starts failing. Prism will POST a JSON payload to your webhook.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <button
              role="switch"
              aria-checked={alertConfig?.selectorAlertEnabled ?? false}
              onClick={() => setAlertConfig((prev) => prev ? { ...prev, selectorAlertEnabled: !prev.selectorAlertEnabled } : prev)}
              className={`relative w-10 h-5 rounded-full transition-colors ${alertConfig?.selectorAlertEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${alertConfig?.selectorAlertEnabled ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-slate-700">Enable selector alerts</span>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={alertWebhook}
              onChange={(e) => setAlertWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/... or your endpoint"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={saveAlertConfig}
              disabled={alertSaving || !alertConfig}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              {alertSaved ? '✓ Saved' : alertSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Selector Health Log */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Selector health log</p>
            <p className="text-xs text-slate-400 mt-0.5">DOM selectors Prism has used — and their auto-heal status.</p>
          </div>
          {healEntries.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-slate-400">
              No selector activity yet. Once Prism performs DOM actions, they'll appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500">Selector</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500">Step</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-500">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500">Heals</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500">Fails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {healEntries.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-600 max-w-[180px] truncate">{e.originalSelector}</td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-[140px] truncate">{e.step?.title ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          e.status === 'healthy' ? 'bg-green-100 text-green-700' :
                          e.status === 'healing' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{e.healCount}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{e.failCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
