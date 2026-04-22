'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, OnboardingFlow } from '@/lib/api';

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<OnboardingFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.flow.list().then((d) => {
      setFlows(d.flows);
      setLoading(false);
    });
  }, []);

  async function createFlow() {
    if (!newName.trim()) return;
    setCreating(true);
    const d = await api.flow.create(newName.trim());
    router.push(`/flows/${d.flow.id}`);
  }

  async function toggleActive(flow: OnboardingFlow) {
    await api.flow.update(flow.id, { isActive: !flow.isActive });
    setFlows((prev) => prev.map((f) => f.id === flow.id ? { ...f, isActive: !f.isActive } : f));
  }

  async function deleteFlow(id: string) {
    if (!confirm('Delete this flow?')) return;
    await api.flow.delete(id);
    setFlows((prev) => prev.filter((f) => f.id !== id));
  }

  const filtered = search
    ? flows.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : flows;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flows</h1>
          <p className="text-slate-500 text-sm mt-1">
            All your flows in one place. Toggle, edit, add — no code needed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flows…"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={() => setShowNew(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + New flow
          </button>
        </div>
      </div>

      {/* New flow form */}
      {showNew && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFlow()}
            placeholder="Flow name…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={createFlow}
            disabled={creating || !newName.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button
            onClick={() => { setShowNew(false); setNewName(''); }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => setShowNew(true)} hasSearch={!!search} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Triggers via</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Steps</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((flow) => (
                <tr key={flow.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{flow.name}</span>
                    {flow.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{flow.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      Agent
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-500">
                    {flow.steps?.length ?? 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className={`text-xs font-semibold ${flow.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {flow.isActive ? 'Live' : 'Draft'}
                      </span>
                      <button
                        onClick={() => toggleActive(flow)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          flow.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                        role="switch"
                        aria-checked={flow.isActive}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            flow.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/flows/${flow.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Edit steps
                      </Link>
                      <button
                        onClick={() => deleteFlow(flow.id)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && flows.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {flows.length} flow{flows.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNew, hasSearch }: { onNew: () => void; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        No flows match your search.
      </div>
    );
  }
  return (
    <div className="p-12 text-center">
      <p className="text-3xl mb-3">◈</p>
      <h2 className="text-base font-semibold text-slate-800 mb-1">No flows yet</h2>
      <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
        Create your first flow to define the journey your AI assistant will guide users through.
      </p>
      <button
        onClick={onNew}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        + New flow
      </button>
    </div>
  );
}
