'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ActivationOverview, FunnelStep, ActivationTrend, ChurnSummary } from '@/lib/api';
import OnboardingChecklist from '@/components/OnboardingChecklist';

export default function DashboardPage() {
  const [activation, setActivation] = useState<ActivationOverview | null>(null);
  const [funnel, setFunnel] = useState<{ flowName: string | null; funnel: FunnelStep[] } | null>(null);
  const [trend, setTrend] = useState<ActivationTrend | null>(null);
  const [churnSummary, setChurnSummary] = useState<ChurnSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.activation.overview(),
      api.activation.funnel(),
      api.activation.trend().catch(() => null),
      api.churn.summary().catch(() => null),
    ]).then(([a, f, t, c]) => {
      setActivation(a);
      setFunnel(f);
      setTrend(t);
      setChurnSummary(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const hasData = (activation?.totalSessions ?? 0) > 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Activation overview</p>
        </div>
        <Link
          href="/activation"
          className="text-sm text-brand-600 hover:text-brand-800 font-medium"
        >
          Full activation report →
        </Link>
      </div>

      <OnboardingChecklist />

      {/* Churn alert banner */}
      {churnSummary && churnSummary.atRisk > 0 && (
        <div className="mb-6 flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {churnSummary.atRisk} user{churnSummary.atRisk > 1 ? 's' : ''} at risk of churning
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {churnSummary.breakdown.critical > 0 && `${churnSummary.breakdown.critical} critical · `}
                {churnSummary.breakdown.high > 0 && `${churnSummary.breakdown.high} high risk`}
              </p>
            </div>
          </div>
          <Link
            href="/churn"
            className="text-xs font-medium text-red-700 hover:text-red-900 border border-red-300 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            View at-risk users →
          </Link>
        </div>
      )}

      {!hasData ? (
        <GettingStarted />
      ) : (
        <>
          {/* Activation metric cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Sessions started"
              value={activation?.totalSessions ?? 0}
              sub="Users who began onboarding"
              icon="🚀"
            />
            <StatCard
              label="Completed onboarding"
              value={`${activation?.completionRate ?? 0}%`}
              sub={`${activation?.completedSessions ?? 0} users`}
              icon="✅"
            />
            <StatCard
              label="Reached first value"
              value={activation?.firstValueCount ?? 0}
              sub="Hit the aha moment"
              icon="🎉"
            />
            <StatCard
              label="Avg time to value"
              value={activation?.avgTimeToValueMins != null ? `${activation.avgTimeToValueMins}m` : '—'}
              sub="From signup to milestone"
              icon="⏱️"
            />
          </div>

          {/* Week-over-week trend strip */}
          {trend && (trend.thisWeek.sessions > 0 || trend.lastWeek.sessions > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">This week vs last week</h2>
                <Link href="/activation" className="text-xs text-brand-600 hover:underline">Full report →</Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Sessions', value: trend.thisWeek.sessions, delta: trend.deltas.sessions, suffix: '' },
                  { label: 'Completion rate', value: trend.thisWeek.completionRate, delta: trend.deltas.completionRate, suffix: '%' },
                  { label: 'First value rate', value: trend.thisWeek.firstValueRate, delta: trend.deltas.firstValueRate, suffix: '%' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">{item.value}{item.suffix}</span>
                      {item.delta !== 0 && (
                        <span className={`text-xs font-semibold ${item.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {item.delta > 0 ? '↑' : '↓'} {Math.abs(item.delta)}{item.suffix}
                        </span>
                      )}
                      {item.delta === 0 && <span className="text-xs text-slate-300">→</span>}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">vs {trend.lastWeek[item.label === 'Sessions' ? 'sessions' : item.label === 'Completion rate' ? 'completionRate' : 'firstValueRate']}{item.suffix} last week</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
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
