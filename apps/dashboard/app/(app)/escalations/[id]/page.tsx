'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, EscalationTicketDetail } from '@/lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-red-50 text-red-700',
  in_progress: 'bg-amber-50 text-amber-700',
  resolved:    'bg-green-50 text-green-700',
};

export default function EscalationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ticket, setTicket] = useState<EscalationTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.escalations.get(id).then(({ ticket }) => {
      setTicket(ticket);
      setNotes(ticket.notes ?? '');
    }).finally(() => setLoading(false));
  }, [id]);

  const update = async (status?: string) => {
    setSaving(true);
    try {
      await api.escalations.update(id, { status, notes });
      const { ticket } = await api.escalations.get(id);
      setTicket(ticket);
      setNotes(ticket.notes ?? '');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-400 py-10 text-center">Loading…</div>;
  if (!ticket) return <div className="text-sm text-red-500 py-10 text-center">Ticket not found.</div>;

  const ctx = ticket.context;
  const userLabel = ticket.userId ?? 'anonymous';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/escalations')}
        className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
      >
        ← Back to escalations
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[ticket.status]}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                ticket.trigger === 'user_requested' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {ticket.trigger === 'user_requested' ? 'User requested' : 'AI detected'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Ticket #{ticket.id.slice(0, 8)} · opened {timeAgo(ticket.createdAt)}
              {ticket.resolvedAt && ` · resolved ${timeAgo(ticket.resolvedAt)}`}
            </p>
          </div>

          {/* Status actions */}
          <div className="flex gap-2">
            {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && (
              <button
                onClick={() => update('in_progress')}
                disabled={saving}
                className="px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 transition-colors disabled:opacity-40"
              >
                Mark in progress
              </button>
            )}
            {ticket.status !== 'resolved' && (
              <button
                onClick={() => update('resolved')}
                disabled={saving}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              >
                Resolve
              </button>
            )}
          </div>
        </div>

        {/* Reason + agent message */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Reason for escalation</p>
            <p className="text-sm text-slate-800">{ticket.reason}</p>
          </div>
          <div className="bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-brand-600 mb-1">What the AI told the user</p>
            <p className="text-sm text-slate-700 italic">"{ticket.agentMessage}"</p>
          </div>
        </div>
      </div>

      {/* User + context */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">User context</h2>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-400 mb-0.5">User ID</p>
            <p className="font-medium text-slate-800">{userLabel}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">First seen</p>
            <p className="font-medium text-slate-800">{timeAgo(ticket.userFirstSeen)}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Flow</p>
            <p className="font-medium text-slate-800">{ctx.flowName}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Stuck on step</p>
            <p className="font-medium text-slate-800">{ctx.stepTitle}</p>
          </div>
        </div>

        {/* Metadata */}
        {Object.keys(ticket.userMetadata).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(ticket.userMetadata as Record<string,unknown>).map(([k, v]) => (
              <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        )}

        {/* Collected data */}
        {Object.keys(ctx.collectedData).length > 0 && (
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-slate-500 mb-1">Collected during session</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(ctx.collectedData).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-slate-400">{k}: </span>
                  <span className="text-slate-700">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conversation */}
      {ctx.recentMessages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Recent conversation</h2>
          <div className="space-y-2">
            {ctx.recentMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Team notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about how this was resolved…"
          rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <button
          onClick={() => update()}
          disabled={saving}
          className="mt-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}
