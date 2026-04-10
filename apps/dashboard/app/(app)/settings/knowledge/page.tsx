'use client';
import { useEffect, useState } from 'react';
import { api, KnowledgeArticle } from '@/lib/api';

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview expand
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const { articles } = await api.kb.list();
      setArticles(articles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setTags('');
    setError(null);
    setShowForm(true);
  };

  const openEdit = (a: KnowledgeArticle) => {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setTags(a.tags.join(', '));
    setError(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (editingId) {
        await api.kb.update(editingId, { title: title.trim(), content: content.trim(), tags: tagList });
      } else {
        await api.kb.create({ title: title.trim(), content: content.trim(), tags: tagList });
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article? The AI will no longer use it.')) return;
    await api.kb.delete(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-1">
            Add docs, FAQs, and guides. The AI agent searches these during onboarding to answer user questions.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openNew}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            + Add article
          </button>
        )}
      </div>

      {/* How it works note */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-xs text-brand-700">
        <span className="font-semibold">How it works:</span> When a user asks a question during onboarding,
        the AI finds the most relevant articles using semantic search and uses them to give accurate,
        product-specific answers — without hallucinating.
      </div>

      {/* Article form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-sm">
            {editingId ? 'Edit article' : 'New article'}
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How to connect your data source"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your documentation, FAQ answer, or guide here. Plain text or markdown."
              rows={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tags <span className="text-slate-400 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. setup, billing, api"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              {saving && (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add article'}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Article list */}
      {loading ? (
        <div className="text-sm text-slate-400 py-6 text-center">Loading…</div>
      ) : articles.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-400 text-sm mb-3">No articles yet.</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Add your product docs and FAQs so the AI can answer user questions with accurate, specific information.
          </p>
          <button
            onClick={openNew}
            className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Add your first article
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => {
            const isExpanded = expanded === a.id;
            return (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                    {!isExpanded && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.content}</p>
                    )}
                    {a.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {a.tags.map((t) => (
                          <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : a.id)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {isExpanded ? 'collapse' : 'preview'}
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="px-2 py-1 text-xs text-brand-600 hover:text-brand-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                      {a.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
