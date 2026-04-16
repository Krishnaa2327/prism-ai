'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ActivationOverview, FunnelStep, ActivationTrend, AgentHealth } from '@/lib/api';
import OnboardingChecklist from '@/components/OnboardingChecklist';

export default function DashboardPage() {
  const [activation, setActivation] = useState<ActivationOverview | null>(null);
  const [funnel, setFunnel] = useState<{ flowName: string | null; funnel: FunnelStep[] } | null>(null);
  const [trend, setTrend] = useState<ActivationTrend | null>(null);
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.activation.overview(),
      api.activation.funnel(),
      api.activation.trend().catch(() => null),
      api.analytics.health().catch(() => null),
    ]).then(([a, f, t, h]) => {
      setActivation(a);
      setFunnel(f);
      setTrend(t);
      setHealth(h);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const hasData = (activation?.totalSessions ?? 0) > 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">This week's impact</p>
        </div>
        <Link
          href="/activation"
          className="text-sm text-brand-600 hover:text-brand-800 font-medium"
        >
          Full activation report →
        </Link>
      </div>

      <OnboardingChecklist />

      {/* Agent health panel */}
      {health && <AgentHealthPanel health={health} />}

      {!hasData ? (
        <GettingStarted />
      ) : (
        <>
          {/* ROI metric cards — this week framing with deltas */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <ROICard
              label="Completed onboarding"
              value={trend ? `${trend.thisWeek.completionRate}%` : `${activation?.completionRate ?? 0}%`}
              context={trend ? `${trend.thisWeek.completed} of ${trend.thisWeek.sessions} this week` : `${activation?.completedSessions ?? 0} total`}
              delta={trend?.deltas.completionRate ?? null}
              deltaLabel="vs last week"
              deltaSuffix="%"
              highlight
            />
            <ROICard
              label="Sessions this week"
              value={trend ? trend.thisWeek.sessions : activation?.totalSessions ?? 0}
              context={trend ? `${trend.lastWeek.sessions} last week` : 'all time'}
              delta={trend?.deltas.sessions ?? null}
              deltaLabel="vs last week"
            />
            <ROICard
              label="Reached first value"
              value={trend ? trend.thisWeek.firstValue : activation?.firstValueCount ?? 0}
              context={trend ? `${trend.thisWeek.firstValueRate}% of sessions` : 'hit the aha moment'}
              delta={trend ? trend.thisWeek.firstValue - trend.lastWeek.firstValue : null}
              deltaLabel="vs last week"
            />
            <ROICard
              label="Avg time to activation"
              value={activation?.avgTimeToValueMins != null ? `${activation.avgTimeToValueMins}m` : '—'}
              context="from start to milestone"
              delta={null}
              deltaLabel=""
            />
          </div>

          {/* Drop-off funnel preview */}
          {funnel && funnel.funnel.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-slate-700">
                  Drop-off funnel{funnel.flowName ? ` — ${funnel.flowName}` : ''}
                </h2>
                <Link href="/activation" className="text-xs text-brand-600 hover:underline">
                  View full report
                </Link>
              </div>
              <div className="space-y-3">
                {funnel.funnel.map((step, idx) => {
                  const pct = step.started > 0
                    ? Math.round((step.completed / step.started) * 100)
                    : 0;
                  return (
                    <div key={step.stepId}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-medium ${step.isMilestone ? 'text-brand-700' : 'text-slate-700'}`}>
                          {idx + 1}. {step.stepTitle}
                          {step.isMilestone && <span className="ml-2 text-brand-500">(milestone)</span>}
                        </span>
                        <span className={step.dropOffRate > 30 ? 'text-red-500 font-semibold' : 'text-slate-400'}>
                          {step.dropOffRate}% drop-off
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {step.completed} / {step.started} completed
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ROICard({
  label, value, context, delta, deltaLabel, deltaSuffix = '', highlight = false,
}: {
  label: string;
  value: string | number;
  context: string;
  delta: number | null;
  deltaLabel: string;
  deltaSuffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${highlight ? 'border-brand-200' : 'border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{label}</p>
      <div className="flex items-baseline gap-2.5 mb-1">
        <span className={`text-3xl font-bold ${highlight ? 'text-brand-700' : 'text-slate-900'}`}>{value}</span>
        {delta !== null && delta !== 0 && (
          <span className={`text-sm font-semibold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}{deltaSuffix}
          </span>
        )}
        {delta === 0 && <span className="text-sm text-slate-300">→</span>}
      </div>
      <p className="text-xs text-slate-400">
        {context}
        {delta !== null && deltaLabel && (
          <span className="text-slate-300"> · {deltaLabel}</span>
        )}
      </p>
    </div>
  );
}

function GettingStarted() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="text-5xl mb-4">🗺️</div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Set up your first onboarding flow</h2>
      <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
        Define the steps your users need to reach first value. The AI copilot will guide each
        user through them automatically.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/flows"
          className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Create your first flow
        </Link>
        <Link
          href="/settings/widget"
          className="border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          Get your API key
        </Link>
      </div>
    </div>
  );
}

function AgentHealthPanel({ health }: { health: AgentHealth }) {
  const dotColor = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500',
    unknown: 'bg-slate-300',
  }[health.status];

  const label = {
    green: 'Healthy',
    yellow: 'Degraded',
    red: 'Unhealthy',
    unknown: 'No data yet',
  }[health.status];

  const labelColor = {
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
    unknown: 'text-slate-500',
  }[health.status];

  function fmtMs(ms: number | null) {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function fmtRelative(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const windowLabel = health.windowHours === 24 ? 'last 24h' : 'last 7d';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-3 w-3 rounded-full ${dotColor} ring-2 ring-offset-1 ${
            health.status === 'green' ? 'ring-green-200' :
            health.status === 'yellow' ? 'ring-yellow-200' :
            health.status === 'red' ? 'ring-red-200' : 'ring-slate-200'
          }`} />
          <h2 className="text-sm font-semibold text-slate-700">Agent health</h2>
          <span className={`text-sm font-semibold ${labelColor}`}>{label}</span>
        </div>
        <span className="text-xs text-slate-400">{windowLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-slate-400 mb-1">Success rate</p>
          <p className="text-2xl font-bold text-slate-900">
            {health.successRate !== null ? `${health.successRate}%` : '—'}
          </p>
          <p className="text-xs text-slate-400">{health.completedSessions}/{health.totalSessions} sessions</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Avg step time</p>
          <p className="text-2xl font-bold text-slate-900">{fmtMs(health.avgResponseMs)}</p>
          <p className="text-xs text-slate-400">per completed step</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Recent sessions</p>
          <p className="text-2xl font-bold text-slate-900">{health.sessions.length}</p>
          <p className="text-xs text-slate-400">shown below</p>
        </div>
      </div>

      {health.sessions.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Last 10 sessions</p>
          <div className="space-y-1">
            {health.sessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between text-xs hover:bg-slate-50 -mx-1 px-1 py-0.5 rounded">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    s.status === 'completed' ? 'bg-green-500' :
                    s.status === 'active'    ? 'bg-blue-500'  : 'bg-slate-300'
                  }`} />
                  <span className="text-slate-600 truncate max-w-[140px]">{s.flowName}</span>
                  {s.userId && <span className="text-slate-400 truncate max-w-[100px]">· {s.userId}</span>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className={`font-medium ${
                    s.status === 'completed' ? 'text-green-600' :
                    s.status === 'active'    ? 'text-blue-600'  : 'text-slate-400'
                  }`}>{s.status}</span>
                  <span className="text-slate-400">{fmtRelative(s.lastActiveAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 bg-slate-200 rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
      </div>
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  );
}
