'use client';
import { useEffect, useState } from 'react';
import { api, ChurnUser, ChurnAtRiskResponse } from '@/lib/api';

const RISK_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  medium:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  low:      { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-400' },
};

function RiskBadge({ risk, score }: { risk: ChurnUser['risk']; score: number }) {
  const c = RISK_COLORS[risk];
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg} ${c.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`text-xs font-semibold ${c.text}`}>{score}</span>
      <span className={`text-xs ${c.text} capitalize`}>{risk}</span>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(fraction * 100);
  const color = pct > 60 ? 'bg-green-400' : pct > 30 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums">{pct}%</span>
    </div>
  );
}

export default function ChurnPage() {
  const [data, setData] = useState<ChurnAtRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.churn.atRisk(20).then(setData).finally(() => setLoading(false));
  }, []);

  const users = (data?.users ?? []).filter((u) => filter === 'all' || u.risk === filter);
  const breakdown = data?.breakdown;

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Churn Risk</h1>
        <p className="text-slate-500 text-sm mt-1">
          Users who started onboarding but are showing signs of abandonment, ranked by risk score.
        </p>
      </div>

      {/* Breakdown cards */}
      {breakdown && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: 'all', label: 'At risk', value: breakdown.total, color: 'text-slate-900' },
            { key: 'critical', label: 'Critical', value: breakdown.critical, color: 'text-red-600' },
            { key: 'high', label: 'High', value: breakdown.high, color: 'text-orange-500' },
            { key: 'medium', label: 'Medium', value: breakdown.medium, color: 'text-amber-500' },
          ].map(({ key, label, value, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`bg-white border rounded-xl p-4 text-left transition-colors ${
                filter === key ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 flex gap-2">
        <span>ℹ️</span>
        <span>
          Risk scores are computed from: time since last activity, steps completed, session age.
          Score 75+ = critical, 50–74 = high, 25–49 = medium. Only active sessions with score ≥20 are shown.
        </span>
      </div>

      {/* User table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-slate-700 font-medium">No at-risk users</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'all' ? 'All active users are progressing normally.' : `No ${filter} risk users right now.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isExpanded = expandedId === user.sessionId;
            return (
              <div
                key={user.sessionId}
                className={`bg-white border rounded-xl transition-colors ${
                  user.risk === 'critical' ? 'border-red-200' : 'border-slate-200'
                }`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : user.sessionId)}
                >
                  {/* Risk badge */}
                  <RiskBadge risk={user.risk} score={user.score} />

                  {/* User ID */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {user.userId ?? <span className="text-slate-400 italic">Anonymous</span>}
                    </p>
                    <p className="text-xs text-slate-400">{user.flowName}</p>
                  </div>

                  {/* Progress */}
                  <div className="hidden sm:block">
                    <ProgressBar fraction={user.progressFraction} />
                    <p className="text-xs text-slate-400 mt-0.5">
                      {user.stepsCompleted}/{user.totalSteps} steps
                    </p>
                  </div>

                  {/* Last active */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-700">{timeAgo(user.lastActiveAt)}</p>
                    <p className="text-xs text-slate-400">last active</p>
                  </div>

                  {/* Expand chevron */}
                  <span className="text-slate-300 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                    {/* Risk factors */}
                    {user.factors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1.5">Risk factors</p>
                        <div className="flex flex-wrap gap-2">
                          {user.factors.map((f, i) => (
                            <span key={i} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-brand-800 mb-0.5">Recommended action</p>
                      <p className="text-xs text-brand-700">{user.recommendation}</p>
                    </div>

                    {/* Metadata */}
                    {Object.keys(user.userMetadata).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">User metadata</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(user.userMetadata).map(([k, v]) => (
                            <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Session info */}
                    <div className="grid grid-cols-3 gap-4 text-xs text-slate-500">
                      <div>
                        <p className="text-slate-400">First seen</p>
                        <p className="font-medium text-slate-700">{timeAgo(user.firstSeenAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Session started</p>
                        <p className="font-medium text-slate-700">{timeAgo(user.startedAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Status</p>
                        <p className="font-medium text-slate-700 capitalize">{user.status}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
