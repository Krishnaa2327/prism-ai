'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, OnboardingFlow } from '@/lib/api';

interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  benchmarkTimeToValueMins: number;
  stepCount: number;
}

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<OnboardingFlow[]>([]);
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    Promise.all([
      api.flow.list(),
      api.flow.listTemplates(),
    ]).then(([d, t]) => {
      setFlows(d.flows);
      setTemplates(t.templates);
      // show template picker automatically if no flows yet
      if (d.flows.length === 0) setShowTemplates(true);
      setLoading(false);
    });
  }, []);

  async function createFromTemplate(templateId: string) {
    setCreating(true);
    const d = await api.flow.createFromTemplate(templateId);
    setCreating(false);
    router.push(`/flows/${d.flow.id}`);
  }

  async function createBlank() {
    if (!newName.trim()) return;
    setCreating(true);
    const d = await api.flow.create(newName.trim());
    setFlows((prev) => [...prev, d.flow]);
    setNewName('');
    setCreating(false);
  }

  async function toggleActive(flow: OnboardingFlow) {
    await api.flow.update(flow.id, { isActive: !flow.isActive });
    setFlows((prev) => prev.map((f) => f.id === flow.id ? { ...f, isActive: !f.isActive } : f));
  }

  async function deleteFlow(id: string) {
    if (!confirm('Delete this flow?')) return;
    await api.flow.delete(id);
    setFlows((prev) => prev.filter((f) => f.id !== id));
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Onboarding Flows</h1>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-brand-600 hover:text-brand-800 font-medium border border-brand-200 px-3 py-1.5 rounded-lg"
        >
          {showTemplates ? 'Hide templates' : '+ Start from template'}
        </button>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        Define the step-by-step journey to first value. The AI copilot runs it for every new user.
      </p>

      {/* ── Template picker ─────────────────────────────────────────────── */}
      {showTemplates && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Start from a proven template</h2>
          <p className="text-xs text-slate-400 mb-4">
            Pre-built flows with tested prompts and benchmarks. Customise after creating.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => createFromTemplate(t.id)}
                disabled={creating}
                className="text-left border border-slate-200 rounded-xl p-5 hover:border-brand-400 hover:bg-brand-50 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{t.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{t.stepCount} steps</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{t.description}</p>
                <div className="flex items-center gap-1 text-xs text-brand-600 font-medium">
                  <span>⏱</span>
                  <span>Industry avg: {t.benchmarkTimeToValueMins} min to first value</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or start from scratch</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        </div>
      )}

      {/* ── Blank flow creator ───────────────────────────────────────────── */}
      <div className="flex gap-3 mb-8">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createBlank()}
          placeholder="Flow name (e.g. My SaaS Onboarding)"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={createBlank}
          disabled={creating || !newName.trim()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create blank'}
        </button>
      </div>

      {/* ── Existing flows ───────────────────────────────────────────────── */}
      {flows.length === 0 && !showTemplates && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-slate-500 text-sm">No flows yet.</p>
          <button
            onClick={() => setShowTemplates(true)}
            className="mt-3 text-brand-600 text-sm font-medium hover:underline"
          >
            Start from a template →
          </button>
        </div>
      )}

      <div className="space-y-4">
        {flows.map((flow) => (
          <div key={flow.id} className="border border-slate-200 rounded-xl p-5 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{flow.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    flow.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {flow.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {flow.description && (
                  <p className="text-slate-500 text-sm mt-1">{flow.description}</p>
                )}
                <p className="text-slate-400 text-xs mt-2">
                  {flow.steps?.length ?? 0} step{flow.steps?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(flow)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                >
                  {flow.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <Link
                  href={`/flows/${flow.id}`}
                  className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  Edit Steps
                </Link>
                <button
                  onClick={() => deleteFlow(flow.id)}
                  className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
