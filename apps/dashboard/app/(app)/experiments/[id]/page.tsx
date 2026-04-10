'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ExperimentResults } from '@/lib/api';

function StatBox({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white'}`}>
      <p className={`text-2xl font-bold ${highlight ? 'text-brand-700' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function ExperimentResultsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ExperimentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [declaring, setDeclaring] = useState(false);

  useEffect(() => {
    api.experiments.results(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  async function declareWinner(winnerId: string) {
    setDeclaring(true);
    try {
      await api.experiments.update(id, { status: 'concluded', winnerId });
      const fresh = await api.experiments.results(id);
      setData(fresh);
    } finally {
      setDeclaring(false);
    }
  }

  async function togglePause() {
    if (!data) return;
    const newStatus = data.experiment.status === 'paused' ? 'running' : 'paused';
    await api.experiments.update(id, { status: newStatus });
    const fresh = await api.experiments.results(id);
    setData(fresh);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}</div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }
  if (!data) return <p className="text-slate-400">Experiment not found.</p>;

  const { experiment: exp, control, variant, significant, lift } = data;
  const variantWins = variant.completionRate > control.completionRate;
  const concluded = exp.status === 'concluded';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/experiments')} className="text-xs text-slate-400 hover:text-slate-700 mb-1 transition-colors">
          ← Experiments
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{exp.name}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {exp.controlFlow.name} <span className="text-slate-300">vs</span> {exp.variantFlow.name}
              <span className="ml-2 text-slate-400">· {100 - exp.trafficSplit}/{exp.trafficSplit} split</span>
            </p>
          </div>
          {!concluded && (
            <div className="flex gap-2">
              <button
                onClick={togglePause}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                {exp.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Significance banner */}
      {significant && !concluded && (
        <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${
          variantWins ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div>
            <p className={`text-sm font-semibold ${variantWins ? 'text-green-700' : 'text-amber-700'}`}>
              {variantWins ? '🏆 Variant is winning' : '⚠️ Control is winning'} — statistically significant (95% confidence)
            </p>
            <p className={`text-xs mt-0.5 ${variantWins ? 'text-green-600' : 'text-amber-600'}`}>
              {lift !== null && lift !== 0 ? `${lift > 0 ? '+' : ''}${lift}% lift in completion rate · ` : ''}
              z-score: {data.zScore}
            </p>
          </div>
          <button
            onClick={() => declareWinner(variantWins ? exp.variantFlow.id : exp.controlFlow.id)}
            disabled={declaring}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors flex-shrink-0"
          >
            Declare winner →
          </button>
        </div>
      )}

      {concluded && exp.winnerId && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-green-700">
            🏆 Winner: {exp.winnerId === exp.controlFlow.id ? exp.controlFlow.name : exp.variantFlow.name}
          </p>
          <p className="text-xs text-green-600 mt-0.5">Concluded {exp.concludedAt ? new Date(exp.concludedAt).toLocaleDateString() : ''}</p>
        </div>
      )}

      {!significant && !concluded && (control.total + variant.total) > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-sm text-slate-600">
            Not yet statistically significant — need at least 30 participants per arm and a larger difference. Keep collecting data.
          </p>
        </div>
      )}

      {/* Side-by-side stat cards */}
      <div className="grid grid-cols-2 gap-6">
        {[
          { label: exp.controlFlow.name, stats: control, arm: 'control', flowId: exp.controlFlow.id },
          { label: exp.variantFlow.name,  stats: variant, arm: 'variant', flowId: exp.variantFlow.id  },
        ].map(({ label, stats, arm, flowId }) => {
          const isWinner = exp.winnerId === flowId;
          return (
            <div key={arm} className={`rounded-xl border p-5 space-y-4 ${isWinner ? 'border-green-300 bg-green-50/30' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <div className="flex items-center gap-2">
                  {isWinner && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Winner</span>}
                  <span className="text-xs text-slate-400 capitalize">{arm}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Participants" value={stats.total} />
                <StatBox label="Completed" value={`${stats.completionRate}%`} highlight={isWinner} />
                <StatBox label="Avg time" value={formatDuration(stats.avgTimeMs)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Step-by-step funnel */}
      {control.stepStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Step-by-step completion rate</h2>
          <div className="space-y-3">
            {control.stepStats.map((step, i) => {
              const variantStep = variant.stepStats[i];
              const controlRate = step.completionRate;
              const variantRate = variantStep?.completionRate ?? 0;
              const delta = variantRate - controlRate;
              return (
                <div key={step.stepId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate max-w-xs">
                      {step.order + 1}. {step.title}
                    </span>
                    <span className={`font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {delta > 0 ? '+' : ''}{delta}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { rate: controlRate, label: 'control' },
                      { rate: variantRate, label: 'variant' },
                    ].map(({ rate, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${label === 'variant' ? 'bg-brand-500' : 'bg-slate-400'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-slate-400 inline-block" />Control</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-brand-500 inline-block" />Variant</span>
          </div>
        </div>
      )}
    </div>
  );
}
