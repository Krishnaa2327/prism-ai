'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, HealEntry } from '@/lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG = {
  failing: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Failing'  },
  healing: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  label: 'Healing'  },
  healthy: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Healthy'  },
};

const STRATEGY_LABELS: Record<string, string> = {
  'primary':      'CSS selector',
  'data-testid':  'data-testid',
  'name':         'name attr',
  'aria-label':   'aria-label',
  'placeholder':  'placeholder',
  'exact-text':   'exact text',
  'fuzzy-class':  'fuzzy class',
  'fuzzy-text':   'fuzzy text',
  'failed':       'no match',
};

function StatusBadge({ status }: { status: HealEntry['status'] }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function FlowHealthPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'failing' | 'healing'>('all');
  const [since, setSince] = useState<string>('');

  useEffect(() => {
    api.flowHealth.list().then((data) => {
      setEntries(data.entries);
      setSince(data.since);
    }).finally(() => setLoading(false));
  }, []);

  const visible = entries.filter((e) =>
    filter === 'all' ? true : e.status === filter
  );

  const failingCount = entries.filter((e) => e.status === 'failing').length;
  const healingCount = entries.filter((e) => e.status === 'healing').length;
  const healthyCount = entries.filter((e) => e.status === 'healthy').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => router.push('/flows')}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            ← Flows
          </button>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Flow Health</h1>
        <p className="text-slate-500 text-sm mt-1">
          Selectors that the self-healing engine had to patch — last 30 days.
          {since && <span className="text-slate-400"> Since {new Date(since).toLocaleDateString()}.</span>}
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Failing', value: failingCount, color: 'text-red-600', desc: 'No fallback found — action silently dropped' },
          { label: 'Healing', value: healingCount, color: 'text-amber-600', desc: 'Fallback in use — selector likely changed' },
          { label: 'Healthy', value: healthyCount, color: 'text-green-600', desc: 'Primary selector works as configured' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Failing alert */}
      {failingCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-red-500 mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">
              {failingCount} selector{failingCount > 1 ? 's are' : ' is'} completely broken
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              These actions are silently dropped when the AI tries to execute them.
              Update the CSS selectors in your step editor or add <code className="bg-red-100 px-1 rounded">data-testid</code> attributes to your elements.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['all', 'failing', 'healing'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'all' ? `All (${entries.length})` : f === 'failing' ? `Failing (${failingCount})` : `Healing (${healingCount})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-sm text-slate-400 py-10 text-center">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">
              {filter === 'all' ? '🎉 All selectors are healthy.' : `No ${filter} selectors.`}
            </p>
            {filter === 'all' && (
              <p className="text-xs text-slate-300 mt-1">
                Entries appear here when the resolver uses a fallback or fails to find an element.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Selector</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Step / Flow</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Fallback used</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Events</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.originalSelector + e.page} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>

                  <td className="px-4 py-3 max-w-[200px]">
                    <code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded block truncate">
                      {e.originalSelector}
                    </code>
                    <p className="text-xs text-slate-400 mt-0.5">{e.page}</p>
                    {/* Suggested replacement */}
                    {e.suggestedSelector && e.status !== 'healthy' && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">→</span>
                        <code className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded max-w-[140px] truncate block">
                          {e.suggestedSelector}
                        </code>
                        <CopyButton text={e.suggestedSelector} />
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {e.step ? (
                      <div>
                        <button
                          onClick={() => router.push(`/flows/${e.step!.flowId}`)}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          {e.step.title}
                        </button>
                        <p className="text-xs text-slate-400">{e.step.flowName}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {e.strategies.filter((s) => s !== 'primary' && s !== 'failed').map((s) => (
                        <span key={s} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                          {STRATEGY_LABELS[s] ?? s}
                        </span>
                      ))}
                      {e.status === 'failing' && (
                        <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">no match</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {e.healCount > 0 && (
                      <span className="text-amber-600">{e.healCount} healed</span>
                    )}
                    {e.healCount > 0 && e.failCount > 0 && <span className="text-slate-300"> · </span>}
                    {e.failCount > 0 && (
                      <span className="text-red-600">{e.failCount} failed</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-400">
                    {timeAgo(e.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fix guide */}
      {(failingCount > 0 || healingCount > 0) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">How to fix broken selectors</p>
          <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
            <li>
              <strong>Best fix:</strong> Add <code className="bg-slate-200 px-1 rounded">data-testid="my-element"</code> to the element in your app's HTML.
              The self-healing engine prioritises this — it will never break again.
            </li>
            <li>
              <strong>Quick fix:</strong> Copy the suggested selector from the table above and paste it into the step editor (Action Config → selector field).
            </li>
            <li>
              <strong>If healing:</strong> The flow still works via fallback, but the fallback could fail if the element moves.
              Update the step selector at your convenience.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
