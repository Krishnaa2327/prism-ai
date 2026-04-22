'use client';
import { useEffect, useState } from 'react';
import { api, Insight } from '@/lib/api';

const TYPE_META: Record<Insight['type'], { label: string; icon: string }> = {
  pain_point:           { label: 'Blocker',           icon: '⚠' },
  knowledge_gap:        { label: 'Knowledge gap',     icon: '📖' },
  navigation_confusion: { label: 'Navigation',        icon: '🧭' },
  frequent_question:    { label: 'Recurring question', icon: '💬' },
  low_engagement:       { label: 'Low engagement',    icon: '📉' },
};

const SEVERITY_STYLES: Record<Insight['severity'], { badge: string; border: string; dot: string }> = {
  high:   { badge: 'bg-red-100 text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
  medium: { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  low:    { badge: 'bg-slate-100 text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.insights.list().then((res) => {
      setInsights(res.insights);
      setGeneratedAt(res.generatedAt);
      if (res.insights.length > 0) setOpen(res.insights[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const active = insights.find((i) => i.id === open) ?? null;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
          <p className="text-slate-500 text-sm mt-1">
            Issues flagged. Gaps suggested. Informed by user behaviour.
          </p>
        </div>
        {generatedAt && (
          <p className="text-xs text-slate-400">
            Updated {fmtRelative(generatedAt)}
          </p>
        )}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex gap-6">
          {/* Insight list */}
          <div className="w-72 flex-shrink-0 space-y-2">
            {insights.map((ins) => {
              const meta = TYPE_META[ins.type];
              const sev = SEVERITY_STYLES[ins.severity];
              const isOpen = open === ins.id;
              return (
                <button
                  key={ins.id}
                  onClick={() => setOpen(ins.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                    isOpen ? `${sev.border} bg-white shadow-sm` : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${sev.dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
                          {ins.severity}
                        </span>
                        <span className="text-xs text-slate-400">{meta.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{ins.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{ins.count} occurrences</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          {active && (
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-slate-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{TYPE_META[active.type].icon}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SEVERITY_STYLES[active.severity].badge}`}>
                      {active.severity} severity
                    </span>
                    <span className="text-xs text-slate-400">{TYPE_META[active.type].label}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{active.title}</h2>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{active.description}</p>
                </div>

                {/* Examples */}
                {active.examples.length > 0 && (
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      What users are saying
                    </p>
                    <div className="space-y-2">
                      {active.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed border border-slate-100"
                        >
                          "{ex}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested action */}
                <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100 rounded-b-xl">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                    Suggested action
                  </p>
                  <p className="text-sm text-indigo-800">{getSuggestedAction(active)}</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-3 text-right">
                First detected {fmtRelative(active.detectedAt)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSuggestedAction(ins: Insight): string {
  switch (ins.type) {
    case 'pain_point':
      return 'Add troubleshooting content to your Knowledge Base and update your AI instructions to proactively address these blockers.';
    case 'knowledge_gap':
      return 'Create step-by-step articles in your Knowledge Base covering these how-to topics so the AI can reference them in conversations.';
    case 'navigation_confusion':
      return 'Update your AI instructions to include navigation guidance, or add a knowledge article that maps out key pages and features.';
    case 'frequent_question':
      return 'Consider adding an FAQ section to your Knowledge Base or surfacing answers directly in your product UI.';
    case 'low_engagement':
      return 'Review your AI instructions — make them more conversational and goal-oriented. Ensure the widget appears at the right moment in the user journey.';
  }
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <p className="text-4xl mb-4">✨</p>
      <h2 className="text-base font-semibold text-slate-800 mb-2">No insights yet</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        Once users interact with your AI assistant, Prism will automatically surface patterns, blockers, and gaps here.
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex gap-6 animate-pulse">
      <div className="w-72 space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
      </div>
      <div className="flex-1">
        <div className="h-80 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}
