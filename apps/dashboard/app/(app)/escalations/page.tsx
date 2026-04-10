'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, EscalationTicket } from '@/lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  open:        { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  in_progress: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  resolved:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

export default function EscalationsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<EscalationTicket[]>([]);
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, resolved: 0 });
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = async (status?: string) => {
    setLoading(true);
    try {
      const data = await api.escalations.list(status || undefined);
      setTickets(data.tickets);
      setCounts(data.counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter || undefined); }, [filter]);

  const total = counts.open + counts.in_progress + counts.resolved;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Escalations</h1>
        <p className="text-slate-500 text-sm mt-1">
          Human handoff requests from the AI agent. Respond to open tickets to keep users unblocked.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-slate-800' },
          { label: 'Open', value: counts.open, color: 'text-red-600' },
          { label: 'In progress', value: counts.in_progress, color: 'text-amber-600' },
          { label: 'Resolved', value: counts.resolved, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: '', label: 'All' },
          { key: 'open', label: 'Open' },
          { key: 'in_progress', label: 'In progress' },
          { key: 'resolved', label: 'Resolved' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-sm text-slate-400 py-10 text-center">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">No escalation tickets.</p>
            {!filter && (
              <p className="text-xs text-slate-300 mt-1">
                Tickets appear when the AI detects a frustrated user or a user asks to speak to a human.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Trigger</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/escalations/${t.id}`)}
                  className="border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-800">{t.userId ?? 'anonymous'}</p>
                    {Object.keys(t.userMetadata).length > 0 && (
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">
                        {Object.entries(t.userMetadata as Record<string,unknown>).slice(0,1).map(([k,v])=>`${k}: ${v}`).join('')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-700 max-w-[260px] truncate">{t.reason}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      t.trigger === 'user_requested' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.trigger === 'user_requested' ? 'user' : 'AI detected'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
