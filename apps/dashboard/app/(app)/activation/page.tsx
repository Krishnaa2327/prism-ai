'use client';
import { useEffect, useState } from 'react';
import { api, ActivationOverview, FunnelStep, ActivationTimeline } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function ActivationPage() {
  const [overview, setOverview] = useState<ActivationOverview | null>(null);
  const [funnel, setFunnel] = useState<{ flowName: string | null; totalSessions: number; funnel: FunnelStep[] } | null>(null);
  const [timeline, setTimeline] = useState<ActivationTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.activation.overview(),
      api.activation.funnel(),
      api.activation.timeline(),
    ]).then(([ov, fn, tl]) => {
      setOverview(ov);
      setFunnel(fn);
      setTimeline(tl.timeline);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading activation data…</div>;

  const statCards = [
    { label: 'Total Sessions', value: overview?.totalSessions ?? 0, sub: 'users who started onboarding' },
    {
      label: 'Completion Rate',
      value: `${overview?.completionRate ?? 0}%`,
      sub: `${overview?.completedSessions ?? 0} completed`,
    },
    {
      label: 'First Value Reached',
      value: overview?.firstValueCount ?? 0,
      sub: 'users hit the aha moment',
    },
    {
      label: 'Avg Time to Value',
      value: overview?.avgTimeToValueMins != null ? `${overview.avgTimeToValueMins}m` : '—',
      sub: 'from session start to milestone',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activation Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">
          Where do users drop off? Who reached first value? How long did it take?
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Drop-off funnel */}
      {funnel && funnel.funnel.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-1">
            Drop-off Funnel{funnel.flowName ? ` — ${funnel.flowName}` : ''}
          </h2>
          <p className="text-xs text-slate-400 mb-6">{funnel.totalSessions} sessions total</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnel.funnel} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="stepTitle" width={180} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'completed') return [value, 'Completed'];
                  if (name === 'dropOff') return [value, 'Dropped off'];
                  return [value, name];
                }}
              />
              <Bar dataKey="completed" stackId="a" fill="#6366f1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="dropOff" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Step detail table */}
          <table className="w-full text-sm mt-6">
            <thead>
              <tr className="text-xs text-slate-400 text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Step</th>
                <th className="pb-2 font-medium text-right">Started</th>
                <th className="pb-2 font-medium text-right">Completed</th>
                <th className="pb-2 font-medium text-right">Drop-off</th>
                <th className="pb-2 font-medium text-right">AI-assisted</th>
                <th className="pb-2 font-medium text-right">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {funnel.funnel.map((step) => (
                <tr key={step.stepId} className={`border-b border-slate-50 ${step.isMilestone ? 'font-semibold text-brand-700' : 'text-slate-700'}`}>
                  <td className="py-2">
                    {step.stepTitle}
                    {step.isMilestone && <span className="ml-2 text-xs bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full">milestone</span>}
                  </td>
                  <td className="py-2 text-right">{step.started}</td>
                  <td className="py-2 text-right">{step.completed}</td>
                  <td className={`py-2 text-right ${step.dropOffRate > 40 ? 'text-red-500' : 'text-slate-500'}`}>
                    {step.dropOffRate}%
                  </td>
                  <td className="py-2 text-right">{step.aiAssistedRate}%</td>
                  <td className="py-2 text-right text-slate-400">
                    {step.avgTimeSecs != null ? `${step.avgTimeSecs}s` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline chart */}
      {timeline.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-6">Sessions over time (30 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="started" stroke="#6366f1" strokeWidth={2} dot={false} name="Started" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} name="Completed" />
              <Line type="monotone" dataKey="firstValue" stroke="#f59e0b" strokeWidth={2} dot={false} name="First Value" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {funnel && funnel.funnel.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-500 text-sm">No activation data yet. Create an onboarding flow and embed the widget to start tracking.</p>
        </div>
      )}
    </div>
  );
}
