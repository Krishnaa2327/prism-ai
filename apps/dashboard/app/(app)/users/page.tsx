'use client';
import { useEffect, useState } from 'react';
import { api, EndUserSummary, UserHistoryDetail, UserSessionHistory } from '@/lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    active:    'bg-brand-100 text-brand-700',
    abandoned: 'bg-slate-100 text-slate-500',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500';
}

function stepStatusIcon(status: string) {
  if (status === 'completed') return '✓';
  if (status === 'in_progress') return '●';
  return '○';
}

function stepStatusColor(status: string) {
  if (status === 'completed') return 'text-green-600';
  if (status === 'in_progress') return 'text-brand-600';
  return 'text-slate-300';
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ s }: { s: UserSessionHistory }) {
  const [open, setOpen] = useState(false);
  const completedSteps = s.steps.filter((p) => p.status === 'completed').length;
  const dataKeys = Object.keys(s.collectedData);

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge(s.status)}`}>
          {s.status}
        </span>
        <span className="text-sm font-medium text-slate-800 flex-1 truncate">{s.flowName}</span>
        <span className="text-xs text-slate-400">{completedSteps}/{s.steps.length} steps</span>
        <span className="text-xs text-slate-400">{timeAgo(s.lastActiveAt)}</span>
        <span className="text-slate-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {/* Step progress */}
          <div className="space-y-1">
            {s.steps.map((step) => (
              <div key={step.stepId} className="flex items-center gap-2 text-xs">
                <span className={`font-bold w-4 text-center ${stepStatusColor(step.status)}`}>
                  {stepStatusIcon(step.status)}
                </span>
                <span className="text-slate-700 flex-1">{step.title}</span>
                {step.status === 'completed' && (
                  <span className="text-slate-400">
                    {step.messagesCount > 0 ? `${step.messagesCount} msg` : ''}
                    {step.timeSpentMs > 0 ? ` · ${Math.round(step.timeSpentMs / 1000)}s` : ''}
                    {step.aiAssisted ? ' · AI' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Collected data */}
          {dataKeys.length > 0 && (
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Collected data</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {dataKeys.map((k) => (
                  <span key={k} className="text-xs text-slate-600">
                    <span className="text-slate-400">{k}:</span> {String(s.collectedData[k])}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User detail panel ────────────────────────────────────────────────────────

function UserPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users.history(userId).then(setDetail).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-sm text-slate-400">Loading…</div>
  );
  if (!detail) return null;

  const { user, sessions, mergedCollectedData } = detail;
  const mergedKeys = Object.keys(mergedCollectedData);
  const displayId = user.externalId ?? user.id.slice(0, 12) + '…';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{displayId}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            First seen {timeAgo(user.firstSeenAt)} · Last active {timeAgo(user.lastSeenAt)}
          </p>
          <div className="flex gap-3 mt-2 text-xs text-slate-500">
            <span><span className="font-medium text-slate-700">{detail.totalSessions}</span> sessions</span>
            <span><span className="font-medium text-green-600">{detail.completedSessions}</span> completed</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
      </div>

      {/* Merged collected data */}
      {mergedKeys.length > 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-brand-700 mb-2">All collected data</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {mergedKeys.map((k) => (
              <div key={k} className="text-xs">
                <span className="text-brand-500">{k}: </span>
                <span className="text-slate-700">{String(mergedCollectedData[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {Object.keys(user.metadata).length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Widget metadata</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(user.metadata as Record<string, unknown>).map(([k, v]) => (
              <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Session history</p>
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400">No sessions yet.</p>
        ) : (
          sessions.map((s) => <SessionCard key={s.sessionId} s={s} />)
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<EndUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.users.list({ limit: 50 }).then(({ users, total }) => {
      setUsers(users);
      setTotal(total);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">
          All end users and their onboarding history across sessions.
        </p>
      </div>

      <div className={`grid gap-6 ${selectedId ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
        {/* User table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="text-sm text-slate-400 py-10 text-center">Loading…</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">
              No users yet. Users appear here when they interact with your widget.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {total} user{total !== 1 ? 's' : ''}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">User</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">Latest flow</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">Sessions</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const displayId = u.externalId ?? u.id.slice(0, 12) + '…';
                    const isSelected = selectedId === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedId(isSelected ? null : u.id)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 text-xs truncate max-w-[140px]">{displayId}</p>
                          {Object.keys(u.metadata).length > 0 && (
                            <p className="text-xs text-slate-400 truncate max-w-[140px]">
                              {Object.entries(u.metadata as Record<string,unknown>).slice(0,2).map(([k,v])=>`${k}:${v}`).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.latestSession ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge(u.latestSession.status)}`}>
                                {u.latestSession.status}
                              </span>
                              <span className="text-xs text-slate-600 truncate max-w-[120px]">{u.latestSession.flowName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-700 font-medium">{u.completedSessions}</span>
                          <span className="text-xs text-slate-400">/{u.totalSessions}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(u.lastSeenAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && (
          <UserPanel userId={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}
