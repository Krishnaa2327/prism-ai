'use client';
import { useEffect, useState } from 'react';
import { api, McpConnector } from '@/lib/api';

const AUTH_LABELS: Record<string, string> = {
  none: 'No auth',
  bearer: 'Bearer token',
  api_key: 'API key',
};

function ConnectorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<McpConnector & { authValue?: string }>;
  onSave: (data: { name: string; serverUrl: string; authType: 'none' | 'bearer' | 'api_key'; authValue?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [serverUrl, setServerUrl] = useState(initial?.serverUrl ?? '');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'api_key'>(initial?.authType ?? 'none');
  const [authValue, setAuthValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await onSave({ name, serverUrl, authType, authValue: authValue || undefined });
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production DB"
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">MCP server URL</label>
          <input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mcp.example.com"
            required
            type="url"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Authentication</label>
          <select
            value={authType}
            onChange={(e) => setAuthType(e.target.value as 'none' | 'bearer' | 'api_key')}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="none">No auth</option>
            <option value="bearer">Bearer token</option>
            <option value="api_key">API key</option>
          </select>
        </div>

        {authType !== 'none' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {authType === 'bearer' ? 'Bearer token' : 'API key'}
            </label>
            <input
              value={authValue}
              onChange={(e) => setAuthValue(e.target.value)}
              type="password"
              placeholder={initial ? 'Leave blank to keep existing' : 'Paste token here'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Update connector' : 'Add connector'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function McpConnectorsPage() {
  const [connectors, setConnectors] = useState<McpConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<McpConnector | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    try {
      const { connectors } = await api.mcp.list();
      setConnectors(connectors);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: Parameters<typeof api.mcp.create>[0]) => {
    await api.mcp.create(data);
    setShowForm(false);
    await load();
  };

  const handleUpdate = async (data: Parameters<typeof api.mcp.create>[0]) => {
    if (!editing) return;
    await api.mcp.update(editing.id, data);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this connector?')) return;
    setDeleting(id);
    try {
      await api.mcp.delete(id);
      setConnectors((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const toggleEnabled = async (c: McpConnector) => {
    await api.mcp.update(c.id, { enabled: !c.enabled });
    setConnectors((prev) => prev.map((x) => x.id === c.id ? { ...x, enabled: !c.enabled } : x));
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">MCP Connectors</h1>
        <p className="text-slate-500 text-sm mt-1">
          Connect external tools and data sources to your AI agents via the{' '}
          <span className="font-medium text-slate-700">Model Context Protocol</span>.
          Each connector lets your agents query databases, call APIs, or read from internal services
          during onboarding flows.
        </p>
      </div>

      {/* Explainer */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5 text-sm text-brand-800">
        <p className="font-semibold mb-1">How MCP connectors work</p>
        <p className="text-brand-700">
          Your AI agent calls the MCP server you configure here when it needs live data — for example,
          checking a user&apos;s account status, looking up product configuration, or reading from a
          knowledge graph. The server responds with structured tool results the agent uses to guide
          or complete tasks.
        </p>
      </div>

      {/* Add connector */}
      {!showForm && !editing && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Add connector
        </button>
      )}

      {showForm && (
        <div className="mb-5">
          <ConnectorForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Connector list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
        </div>
      ) : connectors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
          <p className="text-sm">No connectors yet.</p>
          <p className="text-xs mt-1">Add one above to start connecting external tools to your agents.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {connectors.map((c) => (
            <div key={c.id}>
              {editing?.id === c.id ? (
                <ConnectorForm
                  initial={editing}
                  onSave={handleUpdate}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${c.enabled ? 'bg-emerald-400' : 'bg-slate-300'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.serverUrl}</p>
                    <p className="text-xs text-slate-400">{AUTH_LABELS[c.authType]}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleEnabled(c)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {c.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditing(c)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleting === c.id ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
