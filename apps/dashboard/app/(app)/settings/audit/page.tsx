'use client';
import { useEffect, useState } from 'react';
import { api, AuditLogEntry } from '@/lib/api';

const ACTION_COLOR: Record<string, string> = {
  fill_form:   'bg-blue-50 text-blue-700',
  click:       'bg-indigo-50 text-indigo-700',
  navigate:    'bg-violet-50 text-violet-700',
  highlight:   'bg-amber-50 text-amber-700',
  hover_tip:   'bg-teal-50 text-teal-700',
  escalate_to_human: 'bg-red-50 text-red-700',
  goal_complete: 'bg-green-50 text-green-700',
  degrade_to_manual: 'bg-orange-50 text-orange-700',
};

function badge(actionType: string) {
  const cls = ACTION_COLOR[actionType] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {actionType.replace(/_/g, ' ')}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditPage() {
  const [logs, setLogs]     = useState<AuditLogEntry[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    setLoading(true);
    api.audit.list({ limit: LIMIT, offset })
      .then((d) => { setLogs(d.logs); setTotal(d.total); })
      .catch(() => setError('Audit log unavailable — requires Growth plan or above.'))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 text-sm mt-1">
          Every AI action delivered to your users — timestamped proof of guidance.
        </p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {!error && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                {total.toLocaleString()} total actions
              </span>
              <span className="text-xs text-slate-400">Newest first</span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">No audit entries yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-36 flex-shrink-0 text-xs text-slate-400 pt-0.5">
                      {fmt(log.createdAt)}
                    </div>
                    <div className="w-40 flex-shrink-0">{badge(log.actionType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.endUserId && (
                          <span className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
                            user:{log.endUserId.slice(0, 8)}
                          </span>
                        )}
                        {log.sessionId && (
                          <span className="text-xs text-slate-400 font-mono truncate max-w-[120px]">
                            session:{log.sessionId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      {log.payload && Object.keys(log.payload).length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {JSON.stringify(log.payload).slice(0, 120)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between mt-4">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                ← Previous
              </button>
              <span className="text-xs text-slate-400">
                {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <button
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset(offset + LIMIT)}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
