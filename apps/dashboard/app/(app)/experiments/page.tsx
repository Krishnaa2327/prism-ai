'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, FlowExperiment, OnboardingFlow } from '@/lib/api';

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  running:   { label: 'Running',   bg: 'bg-green-50',  text: 'text-green-700'  },
  paused:    { label: 'Paused',    bg: 'bg-amber-50',  text: 'text-amber-700'  },
  concluded: { label: 'Concluded', bg: 'bg-slate-100', text: 'text-slate-600'  },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.concluded;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

export default function ExperimentsPage() {
  const router = useRouter();
  const [experiments, setExperiments] = useState<FlowExperiment[]>([]);
  const [flows, setFlows] = useState<OnboardingFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [form, setForm] = useState({ name: '', controlFlowId: '', variantFlowId: '', trafficSplit: 50 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.experiments.list(),
      api.flow.list(),
    ]).then(([e, f]) => {
      setExperiments(e.experiments);
      setFlows(f.flows);
    }).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name || !form.controlFlowId || !form.variantFlowId) {
      setCreateError('All fields are required');
      return;
    }
    if (form.controlFlowId === form.variantFlowId) {
      setCreateError('Control and variant must be different flows');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const { experiment } = await api.experiments.create(form);
      setExperiments((prev) => [experiment, ...prev]);
      setShowCreate(false);
      setForm({ name: '', controlFlowId: '', variantFlowId: '', trafficSplit: 50 });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create experiment');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
          <p className="text-slate-500 text-sm mt-1">A/B test your onboarding flows — find what drives completion.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
        >
          + New experiment
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">New experiment</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Experiment name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Shorter welcome step"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Control (current flow)</label>
                <select
                  value={form.controlFlowId}
                  onChange={(e) => setForm((f) => ({ ...f, controlFlowId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select flow…</option>
                  {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Variant (new flow to test)</label>
                <select
                  value={form.variantFlowId}
                  onChange={(e) => setForm((f) => ({ ...f, variantFlowId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select flow…</option>
                  {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Traffic to variant: <strong>{form.trafficSplit}%</strong>
                </label>
                <input
                  type="range" min={10} max={90} step={5}
                  value={form.trafficSplit}
                  onChange={(e) => setForm((f) => ({ ...f, trafficSplit: Number(e.target.value) }))}
                  className="w-full accent-brand-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>{100 - form.trafficSplit}% control</span>
                  <span>{form.trafficSplit}% variant</span>
                </div>
              </div>
            </div>

            {createError && <p className="text-sm text-red-600">{createError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {creating ? 'Creating…' : 'Start experiment'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {experiments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <p className="text-slate-400 text-sm">No experiments yet.</p>
          <p className="text-xs text-slate-300 mt-1">
            Create a variant of an existing flow and A/B test it against your control.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => {
            const total = (exp.controlSessions ?? 0) + (exp.variantSessions ?? 0);
            return (
              <div
                key={exp.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer"
                onClick={() => router.push(`/experiments/${exp.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={exp.status} />
                      {exp.winnerId && (
                        <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          🏆 Winner declared
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">{exp.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {exp.controlFlow.name} <span className="text-slate-300 mx-1">vs</span> {exp.variantFlow.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-slate-800">{total}</p>
                    <p className="text-xs text-slate-400">participants</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>{100 - exp.trafficSplit}% control · {exp.trafficSplit}% variant</span>
                  <span>·</span>
                  <span>Started {new Date(exp.startedAt).toLocaleDateString()}</span>
                  {exp.concludedAt && <><span>·</span><span>Concluded {new Date(exp.concludedAt).toLocaleDateString()}</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
