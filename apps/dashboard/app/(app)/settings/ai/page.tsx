'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, KnowledgeArticle, McpConnector } from '@/lib/api';

export default function AIConfigPage() {
  const [instructions, setInstructions] = useState('');
  const [original, setOriginal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [connectors, setConnectors] = useState<McpConnector[]>([]);

  useEffect(() => {
    Promise.all([
      api.config.get(),
      api.kb.list(),
      api.mcp.list(),
    ]).then(([cfg, kb, mcp]) => {
      const val = cfg.customInstructions ?? '';
      setInstructions(val);
      setOriginal(val);
      setArticles(kb.articles);
      setConnectors(mcp.connectors);
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.config.updateAI(instructions);
      setOriginal(instructions);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const isDirty = instructions !== original;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configure agent</h1>
        <p className="text-slate-500 text-sm mt-1">
          Set context, connect your knowledge, and write instructions to control how the AI behaves.
        </p>
      </div>

      <div className="space-y-4">

        {/* Context */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Context</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            The AI always knows the page your user is on via the widget. No setup required.
          </p>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
            <span className="text-base">📍</span>
            <div>
              <p className="font-medium text-slate-700">Current page</p>
              <p className="text-xs text-slate-400 mt-0.5">URL, page title, and user metadata passed automatically from the widget</p>
            </div>
            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Auto</span>
          </div>
        </div>

        {/* Knowledge & Tools */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Knowledge &amp; Tools</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Articles and integrations the AI can reference in conversations.
          </p>

          {loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* KB articles */}
              {articles.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 text-sm">📄</span>
                  <span className="text-sm text-slate-700 flex-1 truncate">{a.title}</span>
                  {a.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              ))}
              {articles.length > 3 && (
                <p className="text-xs text-slate-400 pl-1">+{articles.length - 3} more articles</p>
              )}
              {articles.length === 0 && (
                <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-4 py-3 text-center">
                  No knowledge articles yet
                </div>
              )}

              {/* MCP connectors */}
              {connectors.slice(0, 2).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 text-sm">🔌</span>
                  <span className="text-sm text-slate-700 flex-1 truncate">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {c.enabled ? 'Connected' : 'Disabled'}
                  </span>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <Link
                  href="/settings/knowledge"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Manage knowledge base →
                </Link>
                <span className="text-xs text-slate-300">·</span>
                <Link
                  href="/settings/integrations"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Manage integrations →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instructions</span>
            <span className="text-xs text-slate-400">{instructions.length} / 2000</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Tell the AI how to behave — your product's tone, what to avoid, and any special handling.
          </p>
          {loading ? (
            <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={8}
              maxLength={2000}
              placeholder={`Examples:\n- Our product is a project management tool for remote teams\n- Users often get confused at the "invite teammates" step\n- Always encourage users to invite at least 2 teammates before proceeding\n- Tone: friendly and encouraging, never pushy`}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono leading-relaxed"
            />
          )}

          {/* Base prompt preview */}
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-500 leading-relaxed font-mono">
            <span className="text-slate-400 not-italic">Base prompt (always included):</span><br />
            You are an AI assistant embedded inside &quot;[Your Product]&quot;.<br />
            Help users who are stuck or have questions. Be concise and action-oriented.<br />
            <span className="text-indigo-400">+ your instructions above</span>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={save}
              disabled={saving || !isDirty}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save instructions'}
            </button>
            {isDirty && (
              <button
                onClick={() => setInstructions(original)}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-sm"
              >
                Discard
              </button>
            )}
            {saved && <span className="text-emerald-600 text-sm font-medium">✓ Saved</span>}
          </div>
        </div>

        {/* Model info */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center gap-3">
          <span className="text-base">🤖</span>
          <div>
            <p className="text-sm font-medium text-slate-700">Claude Sonnet 4.6</p>
            <p className="text-xs text-slate-400">Model powering your AI assistant</p>
          </div>
          <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
        </div>

      </div>
    </div>
  );
}
