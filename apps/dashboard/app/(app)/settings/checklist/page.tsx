'use client';
import { useEffect, useState } from 'react';
import { api, ChecklistStep } from '@/lib/api';

const COMPLETION_EVENTS = [
  { value: '', label: 'Manual only' },
  { value: 'page_view', label: 'Page viewed' },
  { value: 'idle', label: 'User was idle' },
  { value: 'exit_intent', label: 'Exit intent triggered' },
  { value: 'rage_click', label: 'Rage click detected' },
  { value: 'form_abandon', label: 'Form abandoned' },
  { value: 'custom', label: 'Custom event' },
];

const BLANK: Omit<ChecklistStep, 'id' | 'organizationId' | 'createdAt'> = {
  label: '',
  description: '',
  order: 0,
  completionEvent: null,
  isRequired: true,
};

export default function ChecklistSettingsPage() {
  const [steps, setSteps] = useState<ChecklistStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.checklist.list().then((d) => setSteps(d.steps)).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setForm({ ...BLANK, order: steps.length });
    setEditingId('new');
    setError(null);
  };

  const openEdit = (step: ChecklistStep) => {
    setForm({
      label: step.label,
      description: step.description,
      order: step.order,
      completionEvent: step.completionEvent,
      isRequired: step.isRequired,
    });
    setEditingId(step.id);
    setError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setError(null);
  };

  const save = async () => {
    if (!form.label.trim()) { setError('Label is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, completionEvent: form.completionEvent || null };
      if (editingId === 'new') {
        const res = await api.checklist.create(payload);
        setSteps((prev) => [...prev, res.step].sort((a, b) => a.order - b.order));
      } else {
        const res = await api.checklist.update(editingId!, payload);
        setSteps((prev) => prev.map((s) => (s.id === editingId ? res.step : s)));
      }
      setEditingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this step?')) return;
    await api.checklist.delete(id);
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) return <div className="animate-pulse h-40 bg-slate-100 rounded-xl" />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Checklist</h1>
        <p className="text-slate-500 text-sm mt-1">
          Define onboarding steps shown inside your widget. Users can tick them off as they go.
        </p>
      </div>

      {/* Steps list */}
      <div className="space-y-3 mb-4">
        {steps.length === 0 && !editingId && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
            No checklist steps yet. Add your first one below.
          </div>
        )}

        {steps.map((step) =>
          editingId === step.id ? (
            <StepForm
              key={step.id}
              form={form}
              setForm={setForm}
              onSave={save}
              onCancel={cancel}
              saving={saving}
              error={error}
            />
          ) : (
            <div key={step.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.order + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{step.label}</p>
                  {!step.isRequired && <span className="text-xs text-slate-400">(optional)</span>}
                  {step.completionEvent && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      auto: {step.completionEvent}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(step)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(step.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}

        {editingId === 'new' && (
          <StepForm
            form={form}
            setForm={setForm}
            onSave={save}
            onCancel={cancel}
            saving={saving}
            error={error}
          />
        )}
      </div>

      {editingId === null && (
        <button
          onClick={openNew}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600 text-sm font-medium transition-colors"
        >
          + Add step
        </button>
      )}
    </div>
  );
}

function StepForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  error,
}: {
  form: typeof BLANK;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Step label *</label>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          placeholder="e.g. Connect your data source"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Description (shown to user)</label>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          placeholder="Optional short description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Order</label>
          <input
            type="number"
            min={0}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            value={form.order}
            onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Auto-complete on event</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white"
            value={form.completionEvent ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, completionEvent: e.target.value || null }))}
          >
            {COMPLETION_EVENTS.map((ev) => (
              <option key={ev.value} value={ev.value}>{ev.label}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isRequired}
          onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
        />
        Required step
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save step'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
