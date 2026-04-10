'use client';
import { useEffect, useState } from 'react';
import { api, OrgConfig } from '@/lib/api';

function buildSnippet(apiKey: string): string {
  const open = String.fromCharCode(60);
  const close = String.fromCharCode(62);
  const slash = String.fromCharCode(47);
  return [
    `${open}!-- Prism Widget --${close}`,
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

  useEffect(() => {
    api.config.get().then(setConfig);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRotateKey = async () => {
    if (!confirm('This will invalidate your current API key. Any sites using the old key will stop working immediately. Continue?')) return;
    setRotating(true);
    try {
      const res = await api.config.rotateKey();
      setConfig((prev) => prev ? { ...prev, apiKey: res.apiKey } : prev);
    } finally {
      setRotating(false);
    }
  };

  const snippet = config ? buildSnippet(config.apiKey) : '';

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Widget Setup</h1>
        <p className="text-slate-500 text-sm mt-1">Embed the AI widget in your SaaS product with one snippet.</p>
      </div>

      <div className="space-y-5">
        {/* API Key */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">API Key</h2>
          <p className="text-xs text-slate-400 mb-3">Keep this secret — it identifies your organization.</p>
          {config ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 font-mono overflow-x-auto">
                {config.apiKey}
              </code>
              <button
                onClick={() => copyToClipboard(config.apiKey, 'key')}
                className="shrink-0 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {copied === 'key' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          )}
          <button
            onClick={handleRotateKey}
            disabled={rotating || !config}
            className="mt-3 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
          >
            {rotating ? 'Rotating…' : '↺ Rotate key'}
          </button>
        </div>

        {/* Embed snippet */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Embed Snippet</h2>
              <p className="text-xs text-slate-400 mt-0.5">Paste this before the closing &lt;/body&gt; tag on every page.</p>
            </div>
            <button
              onClick={() => copyToClipboard(snippet, 'snippet')}
              disabled={!config}
              className="shrink-0 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            >
              {copied === 'snippet' ? '✓ Copied!' : 'Copy snippet'}
            </button>
          </div>
          {config ? (
            <pre className="bg-slate-900 text-slate-100 rounded-lg px-4 py-4 text-xs overflow-x-auto leading-relaxed whitespace-pre">
              {snippet}
            </pre>
          ) : (
            <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
          )}
        </div>

        {/* Installation guide */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Setup Guide</h2>
          <ol className="space-y-3 text-sm text-slate-600">
            {[
              { step: '1', text: 'Copy the snippet above' },
              { step: '2', text: 'Paste it before </body> in your HTML (or in your root layout file)' },
              { step: '3', text: 'Replace currentUser.id with your actual user identifier' },
              { step: '4', text: 'Add any metadata you want the AI to know (plan type, current step, etc.)' },
              { step: '5', text: 'Test it — open your app, wait 10 seconds, the bubble should appear' },
            ].map(({ step, text }) => (
              <li key={step} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">{step}</span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Config options */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Config Options</h2>
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
                { opt: 'apiKey', def: '—', desc: 'Required. Your organization API key.' },
                { opt: 'userId', def: 'auto', desc: "Your user's ID. Auto-generated if omitted." },
                { opt: 'metadata', def: '{}', desc: 'Extra context passed to the AI (plan, step, etc.)' },
                { opt: 'idleThreshold', def: '30000', desc: 'Ms of inactivity before triggering (default 30s).' },
                { opt: 'primaryColor', def: '#6366f1', desc: 'Widget accent color (hex).' },
                { opt: 'position', def: 'bottom-right', desc: '"bottom-right" or "bottom-left".' },
              ].map(({ opt, def, desc }) => (
                <tr key={opt} className="py-1">
                  <td className="py-2 pr-3 font-mono text-brand-700">{opt}</td>
                  <td className="py-2 pr-3 font-mono text-slate-400">{def}</td>
                  <td className="py-2 text-slate-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
