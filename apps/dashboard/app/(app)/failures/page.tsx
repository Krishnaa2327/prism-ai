'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface FailureEntry {
  sessionId: string;
  userId: string;
  flowName: string;
  completedSteps: number;
  totalSteps: number;
  progressPct: number;
  lastActiveMinutesAgo: number;
  type: 'dropped_off';
}

interface EscalationEntry {
  ticketId: string;
  userId: string;
  flowName: string;
  reason: string;
  createdAt: string;
  status: string;
}

export default function FailuresPage() {
  const [failures, setFailures] = useState<FailureEntry[]>([]);
  const [escalations, setEscalations] = useState<EscalationEntry[]>([]);
  const [summary, setSummary] = useState({ droppedOff: 0, openEscalations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.failures.list().then((d) => {
      setFailures(d.failures);
      setEscalations(d.escalations);
      setSummary(d.summary);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Failure Inbox</h1>
        <p className="text-slate-500 text-sm mt-1">Sessions where users got stuck or asked for help.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Dropped Off</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{summary.droppedOff}</p>
          <p className="text-xs text-red-400 mt-1">Active sessions with no activity for 30+ min</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
          <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Open Escalations</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{summary.openEscalations}</p>
          <p className="text-xs text-orange-400 mt-1">Users who asked to speak to a human</p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      {/* Dropped-off sessions */}
      {!loading && failures.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Dropped Off</h2>
          <div className="space-y-2">
            {failures.map((f) => (
              <Link
                key={f.sessionId}
                href={`/sessions/${f.sessionId}`}
                className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{f.userId}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{f.flowName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-32">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full"
                        style={{ width: `${f.progressPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{f.progressPct}% complete</span>
                    <span className="text-xs text-slate-400">({f.completedSteps}/{f.totalSteps} steps)</span>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {f.lastActiveMinutesAgo < 60
                      ? `${f.lastActiveMinutesAgo}m ago`
                      : `${Math.floor(f.lastActiveMinutesAgo / 60)}h ago`}
                  </span>
                  <span className="text-xs text-brand-600 font-medium">View →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Open escalations */}
      {!loading && escalations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Open Escalations</h2>
          <div className="space-y-2">
            {escalations.map((e) => (
              <div key={e.ticketId} className="bg-white border border-orange-200 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{e.userId}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{e.flowName}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{e.reason}</p>
                  </div>
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full shrink-0">
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && failures.length === 0 && escalations.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm font-medium">No failures right now</p>
          <p className="text-xs mt-1">Check back after your first users complete onboarding</p>
        </div>
      )}
    </div>
  );
}
