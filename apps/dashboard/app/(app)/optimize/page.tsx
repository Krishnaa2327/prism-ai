'use client';
import { useEffect, useState } from 'react';
import { api, OptimizeStep, OptimizeSuggestion } from '@/lib/api';

// ─── Health bar ───────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 45 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${score >= 70 ? 'text-green-600' : score >= 45 ? 'text-amber-600' : 'text-red-500'}`}>
        {score}
      </span>
    </div>
  );
}

// ─── Diff view ────────────────────────────────────────────────────────────────

function PromptDiff({ before, after }: { before: string | null; after: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
      <div>
        <p className="text-slate-400 font-sans mb-1.5 font-medium">Current</p>
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[80px]">
          {before || <em className="text-slate-400 not-italic font-sans">(no custom prompt)</em>}
        </div>
      </div>
      <div>
        <p className="text-green-600 font-sans mb-1.5 font-medium">Suggested</p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
          {after}
        </div>
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, onApply }: {
  step: OptimizeStep;
  onApply: (stepId: string, prompt: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [suggestion, setSuggestion] = useState<OptimizeSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestion = async () => {
    if (suggestion) { setExpanded(true); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await api.optimize.suggest(step.stepId);
      setSuggestion(result);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get suggestion');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!suggestion) return;
    setApplying(true);
    try {
      await onApply(step.stepId, suggestion.suggestedPrompt);
      setApplied(true);
    } finally {
      setApplying(false);
    }
  };

  const healthLabel = step.health >= 70 ? 'Healthy' : step.health >= 45 ? 'Needs attention' : 'Critical';
  const healthColor = step.health >= 70 ? 'text-green-600 bg-green-50' : step.health >= 45 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div className={`bg-white rounded-xl border transition-colors ${
      step.needsOptimization ? 'border-red-200' : 'border-slate-200'
    } p-5`}>
      {/* Step header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-300 font-mono">{step.order}</span>
            <h3 className="font-semibold text-slate-900 text-sm truncate">{step.stepTitle}</h3>
            {step.isMilestone && (
              <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full shrink-0">milestone</span>
            )}
          </div>
          <HealthBar score={step.health} />
        </div>
        <span className={`ml-4 shrink-0 text-xs font-medium px-2 py-1 rounded-full ${healthColor}`}>
          {healthLabel}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-slate-500 mb-4">
        <span>
          <span className="font-semibold text-slate-700">
            {step.stats.completionRate !== null ? `${step.stats.completionRate}%` : '—'}
          </span> completion
        </span>
        <span>
          <span className="font-semibold text-slate-700">
            {step.stats.avgMessages !== null ? step.stats.avgMessages : '—'}
          </span> avg messages
        </span>
        <span>
          <span className="font-semibold text-slate-700">{step.stats.total}</span> sessions
        </span>
        {step.stats.avgTimeSecs !== null && (
          <span>
            <span className="font-semibold text-slate-700">{step.stats.avgTimeSecs}s</span> avg time
          </span>
        )}
      </div>

      {/* Current prompt preview */}
      {step.currentPrompt && (
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-xs text-slate-500 font-mono mb-4 line-clamp-2 leading-relaxed">
          {step.currentPrompt}
        </div>
      )}

      {/* Drop reasons */}
      {Object.keys(step.stats.dropReasons).length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(step.stats.dropReasons).map(([reason, count]) => (
            <span key={reason} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
              {reason}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!applied ? (
        <div className="flex gap-2">
          {step.needsOptimization && (
            <button
              onClick={getSuggestion}
              disabled={loading}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing with AI…
                </>
              ) : suggestion ? 'View suggestion' : 'Optimize with AI'}
            </button>
          )}
          {!step.needsOptimization && step.stats.total > 0 && (
            <button
              onClick={getSuggestion}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 rounded-lg text-xs font-medium transition-colors"
            >
              {loading ? 'Analyzing…' : 'Suggest improvements'}
            </button>
          )}
          {step.stats.total === 0 && (
            <p className="text-xs text-slate-400 py-2">No sessions yet — run some test sessions to enable optimization.</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
          <span>✓</span>
          <span>Prompt applied — new sessions will use the optimized version</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}

      {/* Suggestion panel */}
      {expanded && suggestion && !applied && (
        <div className="mt-5 border-t border-slate-100 pt-5 space-y-4">
          {/* Impact prediction */}
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
            <p className="text-xs font-medium text-brand-800 mb-0.5">Expected impact</p>
            <p className="text-xs text-brand-700">{suggestion.expectedImpact}</p>
          </div>

          {/* Diff */}
          <PromptDiff before={suggestion.currentPrompt} after={suggestion.suggestedPrompt} />

          {/* What changed */}
          {suggestion.changes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">What changed</p>
              <ul className="space-y-1">
                {suggestion.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-green-500 mt-0.5 shrink-0">+</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reasoning */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Reasoning</p>
            <p className="text-xs text-slate-500 leading-relaxed">{suggestion.reasoning}</p>
          </div>

          {/* Apply / dismiss */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={apply}
              disabled={applying}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {applying ? 'Applying…' : 'Apply this prompt'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OptimizePage() {
  const [steps, setSteps] = useState<OptimizeStep[]>([]);
  const [flowName, setFlowName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs_work'>('needs_work');

  useEffect(() => {
    api.optimize.flow().then((res) => {
      setSteps(res.steps);
      setFlowName(res.flowName);
    }).finally(() => setLoading(false));
  }, []);

  const handleApply = async (stepId: string, prompt: string) => {
    await api.optimize.apply(stepId, prompt);
    // Update local state to reflect new prompt
    setSteps((prev) =>
      prev.map((s) => s.stepId === stepId ? { ...s, currentPrompt: prompt, health: Math.min(s.health + 20, 100) } : s)
    );
  };

  const avgHealth = steps.length > 0
    ? Math.round(steps.reduce((s, step) => s + step.health, 0) / steps.length)
    : 0;

  const criticalCount = steps.filter((s) => s.health < 45).length;
  const needsWorkCount = steps.filter((s) => s.needsOptimization).length;

  const displayed = filter === 'needs_work'
    ? steps.filter((s) => s.needsOptimization || s.health < 70)
    : steps;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prompt Optimizer</h1>
        <p className="text-slate-500 text-sm mt-1">
          AI analyzes your step performance data and rewrites underperforming prompts.
          {flowName && <span className="text-slate-400"> — {flowName}</span>}
        </p>
      </div>

      {/* Summary bar */}
      {steps.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Avg health', value: `${avgHealth}/100`, sub: 'across all steps' },
            { label: 'Needs work', value: String(needsWorkCount), sub: `${needsWorkCount > 0 ? 'steps under 60' : 'all steps healthy'}` },
            { label: 'Critical', value: String(criticalCount), sub: 'steps under 45' },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{card.label}</p>
              <p className="text-xs text-slate-300 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter toggle */}
      {steps.length > 0 && (
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {(['needs_work', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'needs_work' ? `Needs work (${needsWorkCount})` : `All steps (${steps.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Step cards */}
      {displayed.length > 0 ? (
        <div className="space-y-4">
          {displayed.map((step) => (
            <StepCard key={step.stepId} step={step} onApply={handleApply} />
          ))}
        </div>
      ) : steps.length > 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-slate-700 font-medium">All steps are healthy</p>
          <p className="text-slate-400 text-sm mt-1">No steps need optimization right now.</p>
          <button onClick={() => setFilter('all')} className="mt-3 text-brand-600 text-sm hover:underline">
            View all steps
          </button>
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">🔬</div>
          <p className="text-slate-500 text-sm">No active onboarding flow found.</p>
          <a href="/flows" className="text-brand-600 text-sm hover:underline mt-1 inline-block">
            Create a flow first →
          </a>
        </div>
      )}
    </div>
  );
}
