'use client';
import { useEffect, useState } from 'react';
import { api, AutoOptimizeSettings, AutoOptimizeRunResult, OptimizationLogEntry } from '@/lib/api';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AutoOptimizePage() {
  const [settings, setSettings] = useState<AutoOptimizeSettings | null>(null);
  const [logs, setLogs] = useState<OptimizationLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runResult, setRunResult] = useState<AutoOptimizeRunResult | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Draft state
  const [threshold, setThreshold] = useState(50);
  const [minSessions, setMinSessions] = useState(10);

  const load = async () => {
    const [s, l] = await Promise.all([
      api.autooptimize.getSettings(),
      api.autooptimize.log(30),
    ]);
    setSettings(s);
    setLogs(l.logs);
    setThreshold(s.threshold);
    setMinSessions(s.minSessions);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (enabled: boolean) => {
    const updated = await api.autooptimize.updateSettings({ enabled });
    setSettings(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.autooptimize.updateSettings({ threshold, minSessions });
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await api.autooptimize.run();
      setRunResult(result);
      await load(); // refresh log + settings
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Auto-Optimize</h1>
        <p className="text-slate-500 text-sm mt-1">
          Automatically improve underperforming prompts using AI — no manual work required.
        </p>
      </div>

      {/* Main toggle card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Auto-optimization</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              When enabled, OnboardAI scans your flow weekly and applies AI-improved prompts to underperforming steps.
            </p>
          </div>
          {settings && (
            <button
              onClick={() => handleToggle(!settings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                settings.enabled ? 'bg-brand-500' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          )}
        </div>

        {settings?.enabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
            Active — scans weekly. Last run: {timeAgo(settings.lastRunAt)}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 text-sm">Optimization thresholds</h2>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Completion rate threshold: <span className="text-brand-600 font-bold">{threshold}%</span>
          </label>
          <input
            type="range" min={20} max={90} step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Optimize steps with completion rate below {threshold}%. Recommended: 50–60%.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Minimum sessions: <span className="text-brand-600 font-bold">{minSessions}</span>
          </label>
          <input
            type="range" min={3} max={100} step={1}
            value={minSessions}
            onChange={(e) => setMinSessions(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Wait for {minSessions} sessions before optimizing. Lower = faster feedback, less data certainty.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      {/* Manual run */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 text-sm mb-1">Run now</h2>
        <p className="text-xs text-slate-400 mb-4">
          Manually trigger an optimization scan. Uses the thresholds above.
          Claude analyzes each underperforming step and applies improved prompts.
        </p>

        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 border border-brand-200 hover:bg-brand-50 disabled:opacity-40 text-brand-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
        >
          {running && (
            <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
          )}
          {running ? 'Running optimization…' : 'Run optimization scan'}
        </button>

        {/* Run result */}
        {runResult && (
          <div className={`mt-4 rounded-lg p-4 ${runResult.stepsOptimized > 0 ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
            <p className="text-xs font-medium text-slate-700 mb-2">Scan complete</p>
            <div className="grid grid-cols-3 gap-3 text-xs text-center mb-3">
              {[
                { label: 'Scanned', value: runResult.stepsScanned },
                { label: 'Optimized', value: runResult.stepsOptimized, color: runResult.stepsOptimized > 0 ? 'text-green-600 font-bold' : '' },
                { label: 'Skipped', value: runResult.stepsSkipped },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-lg p-2 border border-slate-200">
                  <div className={`text-lg font-bold ${c.color ?? 'text-slate-800'}`}>{c.value}</div>
                  <div className="text-slate-400">{c.label}</div>
                </div>
              ))}
            </div>
            {runResult.optimized.map((o) => (
              <div key={o.stepId} className="mt-2 bg-white border border-green-200 rounded-lg p-3 text-xs">
                <p className="font-medium text-slate-800 mb-1">✓ "{o.stepTitle}" optimized</p>
                <p className="text-slate-500">Completion was {o.completionRateBefore}% — {o.reason}</p>
              </div>
            ))}
            {runResult.stepsOptimized === 0 && (
              <p className="text-xs text-slate-500">No steps met the threshold. All steps are performing above {settings?.threshold ?? 50}% or have insufficient data.</p>
            )}
          </div>
        )}
      </div>

      {/* Optimization log */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">
          Optimization history
          <span className="ml-2 text-xs text-slate-400 font-normal">last 30 entries</span>
        </h2>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No optimizations yet. Run a scan or enable auto-optimization to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedLog === log.id;
              return (
                <div key={log.id} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      log.triggeredBy === 'auto' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {log.triggeredBy}
                    </span>
                    <span className="text-xs font-medium text-slate-800 flex-1 truncate">{log.stepTitle}</span>
                    {log.completionRateBefore !== null && (
                      <span className="text-xs text-slate-400">was {log.completionRateBefore}%</span>
                    )}
                    <span className="text-xs text-slate-400">{timeAgo(log.appliedAt)}</span>
                    <span className="text-slate-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2 space-y-2">
                      <p className="text-xs text-slate-500">{log.reason}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <p className="text-slate-400 font-sans mb-1">Before</p>
                          <div className="bg-red-50 rounded p-2 text-slate-600 leading-relaxed">
                            {log.previousPrompt || <em className="text-slate-400 font-sans not-italic">(none)</em>}
                          </div>
                        </div>
                        <div>
                          <p className="text-green-600 font-sans mb-1">After</p>
                          <div className="bg-green-50 rounded p-2 text-slate-700 leading-relaxed">
                            {log.newPrompt}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
