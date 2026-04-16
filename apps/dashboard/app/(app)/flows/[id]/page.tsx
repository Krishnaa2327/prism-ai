'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, OnboardingFlow, OnboardingStep } from '@/lib/api';

const ACTION_TYPES = ['none', 'fill_form', 'click', 'navigate', 'highlight'];

const ACTION_TYPE_LABELS: Record<string, string> = {
  fill_form: 'Fill form',
  click:     'Click',
  navigate:  'Navigate',
  highlight: 'Highlight',
};

const BLANK_STEP: Omit<OnboardingStep, 'id' | 'flowId' | 'createdAt'> = {
  title: '',
  intent: '',
  description: '',
  aiPrompt: '',
  smartQuestions: [],
  actionType: null,
  actionConfig: {},
  allowedActions: [],
  completionEvent: '',
  isMilestone: false,
  order: 0,
};

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [editingStep, setEditingStep] = useState<OnboardingStep | null>(null);
  const [newStep, setNewStep] = useState<typeof BLANK_STEP>({ ...BLANK_STEP });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Trigger config state
  const [triggerDelaySec, setTriggerDelaySec] = useState(30);
  const [urlPattern, setUrlPattern] = useState('');
  const [maxTriggers, setMaxTriggers] = useState(0);
  const [savingTrigger, setSavingTrigger] = useState(false);
  const [triggerSaved, setTriggerSaved] = useState(false);

  useEffect(() => {
    api.flow.get(id).then((d) => {
      setFlow(d.flow);
      setSteps(d.flow.steps ?? []);
      setTriggerDelaySec(Math.round((d.flow.triggerDelayMs ?? 30000) / 1000));
      setUrlPattern(d.flow.urlPattern ?? '');
      setMaxTriggers(d.flow.maxTriggersPerUser ?? 0);
      setLoading(false);
    });
  }, [id]);

  async function saveTriggerConfig() {
    setSavingTrigger(true);
    await api.flow.update(id, {
      triggerDelayMs: triggerDelaySec * 1000,
      urlPattern,
      maxTriggersPerUser: maxTriggers,
    });
    setSavingTrigger(false);
    setTriggerSaved(true);
    setTimeout(() => setTriggerSaved(false), 2000);
  }

  async function addStep() {
    if (!newStep.title.trim()) return;
    setSaving(true);
    const d = await api.flow.createStep(id, newStep);
    setSteps((prev) => [...prev, d.step]);
    setNewStep({ ...BLANK_STEP });
    setSaving(false);
  }

  async function saveEdit() {
    if (!editingStep) return;
    setSaving(true);
    await api.flow.updateStep(id, editingStep.id, editingStep);
    setSteps((prev) => prev.map((s) => s.id === editingStep.id ? editingStep : s));
    setEditingStep(null);
    setSaving(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Delete this step?')) return;
    await api.flow.deleteStep(id, stepId);
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!flow) return <div className="p-8 text-red-500">Flow not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <button onClick={() => router.push('/flows')} className="text-sm text-slate-400 hover:text-slate-700 mb-6 flex items-center gap-1">
        ← Back to flows
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">{flow.name}</h1>
      <p className="text-slate-500 text-sm mb-8">
        Define each step of the journey. The AI copilot will guide users through these steps automatically.
      </p>

      {/* Trigger settings */}
      <div className="border border-slate-200 rounded-xl p-6 mb-8 bg-white">
        <h2 className="font-semibold text-slate-800 mb-1">Trigger Settings</h2>
        <p className="text-xs text-slate-400 mb-5">Control when and how often the widget appears to users.</p>
        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              Delay after page load (seconds)
            </label>
            <input
              type="number"
              min={0}
              value={triggerDelaySec}
              onChange={(e) => setTriggerDelaySec(Math.max(0, Number(e.target.value)))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1">0 = appear immediately</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              URL pattern (comma-separated)
            </label>
            <input
              type="text"
              value={urlPattern}
              onChange={(e) => setUrlPattern(e.target.value)}
              placeholder="/dashboard, /onboarding/*"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1">Empty = all pages. Use * as wildcard.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              Max triggers per user
            </label>
            <input
              type="number"
              min={0}
              value={maxTriggers}
              onChange={(e) => setMaxTriggers(Math.max(0, Number(e.target.value)))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1">0 = unlimited</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveTriggerConfig}
            disabled={savingTrigger}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {savingTrigger ? 'Saving…' : 'Save Trigger Settings'}
          </button>
          {triggerSaved && <span className="text-xs text-green-600 font-medium">Saved</span>}
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-4 mb-10">
        {steps.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
            No steps yet. Add the first step below.
          </div>
        )}
        {steps.map((step, idx) => (
          <div key={step.id} className={`border rounded-xl p-5 bg-white ${step.isMilestone ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200'}`}>
            {editingStep?.id === step.id ? (
              <StepForm
                step={editingStep}
                onChange={setEditingStep}
                onSave={saveEdit}
                onCancel={() => setEditingStep(null)}
                saving={saving}
              />
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">STEP {idx + 1}</span>
                    {step.isMilestone && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        First Value Milestone
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-1">{step.title}</h3>
                  {step.description && <p className="text-slate-500 text-sm mt-0.5">{step.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    {step.intent && <span>Intent: <code>{step.intent}</code></span>}
                    {step.actionType && <span>Action: <code>{step.actionType}</code></span>}
                    {step.completionEvent && <span>Auto-complete on: <code>{step.completionEvent}</code></span>}
                    {(step.smartQuestions as string[])?.length > 0 && (
                      <span>{(step.smartQuestions as string[]).length} smart question(s)</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setEditingStep(step)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                    Edit
                  </button>
                  <button onClick={() => deleteStep(step.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new step */}
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Add Step</h2>
        <StepForm
          step={newStep as OnboardingStep}
          onChange={(s) => setNewStep(s as typeof BLANK_STEP)}
          onSave={addStep}
          onCancel={() => setNewStep({ ...BLANK_STEP })}
          saving={saving}
          isNew
        />
      </div>
    </div>
  );
}

function StepForm({
  step,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew = false,
}: {
  step: OnboardingStep | typeof BLANK_STEP;
  onChange: (s: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  const set = (key: string, value: unknown) => onChange({ ...step, [key]: value });
  const questions = (step.smartQuestions as string[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Step Title *</label>
          <input
            value={step.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Connect your data source"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Intent keyword</label>
          <input
            value={step.intent as string}
            onChange={(e) => set('intent', e.target.value)}
            placeholder="data_connection"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Description (shown to user)</label>
        <input
          value={step.description as string}
          onChange={(e) => set('description', e.target.value)}
          placeholder="We'll connect your analytics data source so you can see real insights."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">AI instructions for this step</label>
        <textarea
          value={step.aiPrompt as string}
          onChange={(e) => set('aiPrompt', e.target.value)}
          placeholder="When the user connects a CSV, ask for their primary metric. Help them pick the right chart type."
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">
          Smart questions (max 2) — one per line
        </label>
        <textarea
          value={questions.join('\n')}
          onChange={(e) => set('smartQuestions', e.target.value.split('\n').filter(Boolean).slice(0, 2))}
          placeholder={"What's your main data source?\nWhat metric do you want to track first?"}
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Page action type</label>
          <select
            value={step.actionType ?? 'none'}
            onChange={(e) => set('actionType', e.target.value === 'none' ? null : e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Auto-complete event</label>
          <input
            value={step.completionEvent as string ?? ''}
            onChange={(e) => set('completionEvent', e.target.value || null)}
            placeholder="data_connected"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={step.isMilestone as boolean}
              onChange={(e) => set('isMilestone', e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-slate-700">First value milestone</span>
          </label>
        </div>
      </div>

      {/* Guardrails — allowed AI action types */}
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">
          Guardrails — allowed AI actions <span className="font-normal text-slate-400">(unchecked = all allowed)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {(['fill_form', 'click', 'navigate', 'highlight'] as const).map((type) => {
            const allowed = (step.allowedActions as string[]) ?? [];
            const isChecked = allowed.length === 0 || allowed.includes(type);
            const isConstrained = allowed.length > 0;
            return (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  className="w-3.5 h-3.5 accent-brand-600"
                  onChange={(e) => {
                    const current: string[] = allowed.length === 0
                      ? ['fill_form', 'click', 'navigate', 'highlight']
                      : [...allowed];
                    const next = e.target.checked
                      ? [...new Set([...current, type])]
                      : current.filter((t) => t !== type);
                    // If all 4 selected, store empty (= all allowed)
                    const allTypes = ['fill_form', 'click', 'navigate', 'highlight'];
                    set('allowedActions', next.length === allTypes.length ? [] : next);
                  }}
                />
                <span className={`text-xs ${isConstrained && !isChecked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {ACTION_TYPE_LABELS[type]}
                </span>
              </label>
            );
          })}
        </div>
        {((step.allowedActions as string[]) ?? []).length > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Restricted to: {(step.allowedActions as string[]).map((t) => ACTION_TYPE_LABELS[t] ?? t).join(', ')}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving || !step.title}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isNew ? 'Add Step' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
