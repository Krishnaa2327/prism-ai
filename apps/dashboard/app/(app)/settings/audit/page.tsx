'use client';
import { useEffect, useState } from 'react';
import { api, AuditLogEntry } from '@/lib/api';

const ACTION_COLOR: Record<string, string> = {
  fill_form:         'bg-blue-100 text-blue-700',
  click:             'bg-violet-100 text-violet-700',
  navigate:          'bg-amber-100 text-amber-700',
  highlight:         'bg-cyan-100 text-cyan-700',
  ask_clarification: 'bg-slate-100 text-slate-600',
  complete_step:     'bg-green-100 text-green-700',
  celebrate_milestone: 'bg-pink-100 text-pink-700',
  escalate_to_human: 'bg-red-100 text-red-700',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    api.audit.list({ limit, offset }).then((d) => {
      setLogs(d.logs);
      setTotal(d.total);
    }).finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Audit Log</h1>
      <p className="text-slate-500 text-sm mb-6">
        Every action the AI took — fill, click, navigate, escalate. {total > 0 && <span className="font-medium">{total} total entries.</span>}
      </p>

      {loading ? (
        <div className="text-slate-400 text-sm py-10 text-center">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
          No actions logged yet. Audit entries appear here as users interact with your flows.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-40">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-36">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Message / Detail</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-32">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const msg = (log.payload as Record<string, unknown>)?.message as string | undefined;
                  const payload = log.payload as Record<string, unknown>;
                  const detail = msg || (payload.selector as string) || (payload.url as string) || '';
                  const colorClass = ACTION_COLOR[log.actionType] ?? 'bg-slate-100 text-slate-600';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={detail}>{detail}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono truncate">
                        {log.sessionId ? log.sessionId.slice(0, 8) + '…' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-400">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
