'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, SessionDetail, SessionStepDetail } from '@/lib/api';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sessions.get(id)
      .then((d) => setSession(d.session))
      .catch(() => setError('Session not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (error || !session) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm">{error || 'Not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-brand-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const totalTimeMs = session.steps.reduce((sum, s) => sum + s.timeSpentMs, 0);
  const completedSteps = session.steps.filter((s) => s.status === 'completed').length;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">
          ← Back
        </button>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-slate-900">Session detail</h1>
        <StatusBadge status={session.status} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Step-by-step action log */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-700">
              Agent action log — {session.flow.name}
            </h2>
            <span className="text-xs text-slate-400">
              {completedSteps}/{session.steps.length} steps · {fmtDuration(totalTimeMs)}
            </span>
          </div>

          {session.steps.map((step, idx) => (
            <StepCard key={step.stepId} step={step} index={idx} />
          ))}

          {session.steps.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No steps recorded for this session
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Session info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Session</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Status" value={session.status} />
              <Row label="Started" value={fmtDatetime(session.startedAt)} />
              {session.completedAt && (
                <Row label="Completed" value={fmtDatetime(session.completedAt)} />
              )}
              <Row label="Last active" value={fmtRelative(session.lastActiveAt)} />
              {session.firstValueAt && (
                <Row label="Milestone" value={fmtDatetime(session.firstValueAt)} highlight />
              )}
              <Row label="Flow" value={session.flow.name} />
            </dl>
          </div>

          {/* User */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">User</h2>
            <dl className="space-y-2 text-sm">
              <Row label="ID" value={session.endUser.externalId ?? 'anonymous'} />
              <Row label="First seen" value={fmtDate(session.endUser.firstSeenAt)} />
              <Row label="Last seen" value={fmtDate(session.endUser.lastSeenAt)} />
            </dl>
            {Object.keys(session.endUser.metadata).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Metadata</p>
                <dl className="space-y-1.5 text-sm">
                  {Object.entries(session.endUser.metadata).map(([k, v]) => (
                    <Row key={k} label={k} value={String(v)} />
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* Collected data */}
          {Object.keys(session.collectedData).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Collected data</h2>
              <dl className="space-y-2 text-sm">
                {Object.entries(session.collectedData).map(([k, v]) => (
                  <Row key={k} label={k} value={String(v)} />
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, index }: { step: SessionStepDetail; index: number }) {
  const statusConfig = {
    completed: { dot: 'bg-green-500', text: 'text-green-700', label: 'Completed' },
    in_progress: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'In progress' },
    not_started: { dot: 'bg-slate-200', text: 'text-slate-400', label: 'Not started' },
    skipped: { dot: 'bg-slate-300', text: 'text-slate-400', label: 'Skipped' },
  }[step.status];

  return (
    <div className={`bg-white rounded-xl border p-5 ${
      step.status === 'completed' ? 'border-slate-200' :
      step.status === 'in_progress' ? 'border-blue-200' : 'border-slate-100'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Step number */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{step.title}</span>
              {step.isMilestone && (
                <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                  milestone
                </span>
              )}
              {step.aiAssisted && (
                <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                  AI assisted
                </span>
              )}
              {step.actionType && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                  {step.actionType}
                </span>
              )}
            </div>
            {step.intent && (
              <p className="text-xs text-slate-400 mt-0.5">{step.intent}</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`inline-block h-2 w-2 rounded-full ${statusConfig.dot}`} />
          <span className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      </div>

      {/* Stats row */}
      {step.status !== 'not_started' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          {step.timeSpentMs > 0 && (
            <span>{fmtDuration(step.timeSpentMs)} spent</span>
          )}
          {step.messagesCount > 0 && (
            <span>{step.messagesCount} message{step.messagesCount !== 1 ? 's' : ''}</span>
          )}
          {step.attempts > 1 && (
            <span>{step.attempts} attempts</span>
          )}
          {step.completedAt && (
            <span className="ml-auto">{fmtDatetime(step.completedAt)}</span>
          )}
          {step.dropReason && (
            <span className="ml-auto text-red-400">dropped: {step.dropReason}</span>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    completed: 'bg-green-50 text-green-700',
    active: 'bg-blue-50 text-blue-700',
    abandoned: 'bg-slate-100 text-slate-500',
  }[status] ?? 'bg-slate-100 text-slate-500';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg}`}>
      {status}
    </span>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-slate-500 shrink-0 capitalize">{label}</dt>
      <dd className={`font-medium text-right break-all ${highlight ? 'text-brand-700' : 'text-slate-800'}`}>
        {value}
      </dd>
    </div>
  );
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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

function PageSkeleton() {
  return (
    <div className="max-w-4xl animate-pulse space-y-4">
      <div className="h-6 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          <div className="h-36 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
