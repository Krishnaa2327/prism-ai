'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, BenchmarkOverview, BenchmarkStep } from '@/lib/api';

// ─── Activation score ring ────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-slate-900">{score}</div>
        <div className="text-xs text-slate-400">/100</div>
      </div>
    </div>
  );
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta, invertGood = false }: { delta: number | null; invertGood?: boolean }) {
  if (delta === null) return <span className="text-slate-300 text-xs">—</span>;
  const isGood = invertGood ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 3;
  if (isNeutral) return <span className="text-xs text-slate-400">≈ avg</span>;
  return (
    <span className={`text-xs font-semibold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {delta > 0 ? '+' : ''}{delta}{typeof delta === 'number' && '%'}
    </span>
  );
}

export default function BenchmarksPage() {
  const [overview, setOverview] = useState<BenchmarkOverview | null>(null);
  const [steps, setSteps] = useState<BenchmarkStep[]>([]);
  const [flowName, setFlowName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.benchmarks.overview(), api.benchmarks.steps()])
      .then(([ov, st]) => {
        setOverview(ov);
        setSteps(st.steps);
        setFlowName(st.flowName);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const maturityLabel = {
    early: 'Early data — benchmarks are research-based',
    growing: 'Growing dataset — blending research + real data',
    mature: 'Live industry benchmarks from aggregated data',
  }[overview?.dataMaturity ?? 'early'];

  const crDelta = overview?.org.completionRate != null
    ? Math.round(overview.org.completionRate - overview.industry.completionRate)
    : null;
  const ttvDelta = overview?.org.avgTimeToValueMins != null
    ? Math.round(overview.org.avgTimeToValueMins - overview.industry.timeToValueMins)
    : null;

  const poorSteps = steps.filter((s) => s.status === 'poor');

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Benchmarks</h1>
          <p className="text-slate-500 text-sm mt-1">
            How your onboarding compares to the industry.{' '}
            <span className="text-slate-400">{overview?.industry.dataPoints ?? 0} data points across {overview?.industry.orgCount ?? 0} companies.</span>
          </p>
        </div>
        {poorSteps.length > 0 && (
          <Link
            href="/optimize"
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Optimize {poorSteps.length} lagging step{poorSteps.length > 1 ? 's' : ''} →
          </Link>
        )}
      </div>

      {/* Data maturity notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-slate-500">
        <span>ℹ️</span>
        <span>{maturityLabel}</span>
      </div>

      {/* Score + headline stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center md:col-span-1">
          <ScoreRing score={overview?.score ?? 50} />
          <p className="text-sm font-semibold text-slate-700 mt-3">Activation Score</p>
          <p className="text-xs text-slate-400 mt-0.5">vs. {overview?.industry.completionRate}% avg</p>
        </div>

        {/* Stat cards */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Completion Rate',
              yours: overview?.org.completionRate != null ? `${overview.org.completionRate}%` : '—',
              industry: `${overview?.industry.completionRate ?? '—'}%`,
              delta: crDelta,
              invertGood: false,
              sub: 'users who finish all steps',
            },
            {
              label: 'Time to Value',
              yours: overview?.org.avgTimeToValueMins != null ? `${overview.org.avgTimeToValueMins}m` : '—',
              industry: `${overview?.industry.timeToValueMins ?? '—'}m`,
              delta: ttvDelta !== null ? -ttvDelta : null, // negative = faster = good
              invertGood: false,
              sub: 'session start → aha moment',
            },
            {
              label: 'First Value Reached',
              yours: String(overview?.org.firstValueCount ?? 0),
              industry: '—',
              delta: null,
              invertGood: false,
              sub: 'users hit the milestone',
            },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{card.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">{card.yours}</span>
                {card.delta !== null && <DeltaBadge delta={card.delta} invertGood={card.invertGood} />}
              </div>
              <p className="text-xs text-slate-400 mt-1">Industry: {card.industry}</p>
              <p className="text-xs text-slate-300 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-step benchmark table */}
      {steps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Step Comparison</h2>
              {flowName && <p className="text-xs text-slate-400 mt-0.5">{flowName}</p>}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Beating avg</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> On par</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Lagging</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Step</th>
                <th className="pb-2 font-medium text-right">Your drop-off</th>
                <th className="pb-2 font-medium text-right">Industry avg</th>
                <th className="pb-2 font-medium text-right">Delta</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.stepId} className="border-b border-slate-50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-mono">{step.order}</span>
                      <span className="text-slate-800 font-medium">{step.stepTitle}</span>
                      {step.isMilestone && (
                        <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">milestone</span>
                      )}
                    </div>
                    {step.recommendation && step.status === 'poor' && (
                      <p className="text-xs text-slate-400 mt-0.5 ml-5">{step.recommendation}</p>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {step.orgDropOffRate !== null ? (
                      <span className={`font-semibold ${step.orgDropOffRate > 50 ? 'text-red-500' : 'text-slate-700'}`}>
                        {step.orgDropOffRate}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right text-slate-500">{step.industryDropOffRate}%</td>
                  <td className="py-3 text-right">
                    {step.delta !== null ? (
                      <span className={`text-xs font-semibold ${
                        step.delta > 10 ? 'text-red-500' : step.delta < -10 ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {step.delta > 0 ? '+' : ''}{step.delta}%
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full inline-block ${
                        step.status === 'good' ? 'bg-green-400'
                        : step.status === 'poor' ? 'bg-red-400'
                        : step.status === 'no_data' ? 'bg-slate-200'
                        : 'bg-amber-400'
                      }`} />
                      <span className="text-xs text-slate-500 capitalize">{step.status.replace('_', ' ')}</span>
                      {step.status === 'poor' && (
                        <Link
                          href="/optimize"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Optimize →
                        </Link>
                      )}
                      {step.status === 'good' && (
                        <span className="text-xs text-green-600">
                          {step.recommendation?.includes('%') ? `−${Math.abs(step.delta!)}% drop-off` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {steps.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-500 text-sm">No flow data yet.</p>
          <Link href="/flows" className="text-brand-600 text-sm hover:underline mt-1 inline-block">
            Create your first onboarding flow →
          </Link>
        </div>
      )}
    </div>
  );
}
