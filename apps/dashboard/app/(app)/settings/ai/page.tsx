'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AISettingsPage() {
  const [instructions, setInstructions] = useState('');
  const [original, setOriginal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.config.get().then((cfg) => {
      const val = cfg.customInstructions ?? '';
      setInstructions(val);
      setOriginal(val);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
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
  };

  const isDirty = instructions !== original;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Configuration</h1>
        <p className="text-slate-500 text-sm mt-1">
          Customize how your AI agent responds to users. Changes apply to all new conversations.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {/* Model info (read-only for now) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Model</label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
            <span className="text-base">🤖</span>
            Claude Sonnet 4.6 (claude-sonnet-4-6)
            <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
          </div>
        </div>

        {/* System prompt */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Custom instructions
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Added to the base system prompt. Tell the AI about your product, tone, or special handling.
          </p>
          {loading ? (
            <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={8}
              maxLength={2000}
              placeholder={`Example:\n- Our product is a project management tool for remote teams\n- Users often get confused at the "invite teammates" step\n- Always encourage users to invite at least 2 teammates\n- Tone: friendly and encouraging, not pushy`}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono leading-relaxed"
            />
          )}
          <p className="text-xs text-slate-400 text-right mt-1">{instructions.length} / 2000</p>
        </div>

        {/* Base prompt preview */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Base system prompt (always included)
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-500 leading-relaxed font-mono">
            You are an AI onboarding assistant embedded inside &quot;[Your Company]&quot;.<br/>
            Your job is to help users who are stuck or about to drop off.<br/>
            Be friendly, concise, and action-oriented (under 100 words per reply).<br/>
            Guide users to complete the step they are on.<br/>
            <span className="text-brand-500">+ your custom instructions above</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {isDirty && (
            <button
              onClick={() => setInstructions(original)}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-sm"
            >
              Discard
            </button>
          )}
          {saved && <span className="text-emerald-600 text-sm">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
