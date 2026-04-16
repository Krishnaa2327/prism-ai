'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, OnboardingStatus } from '@/lib/api';

const STEP_LINKS: Record<string, string> = {
  widget_installed: '/settings/widget',
  first_conversation: '/conversations',
  ai_customized: '/settings/ai',
  upgraded: '/settings/billing',
};

export default function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('oai_onboarding_dismissed') === 'true';
    if (wasDismissed) { setDismissed(true); return; }
    api.onboarding.status().then(setStatus).catch(() => null);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('oai_onboarding_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed || !status || status.allDone) return null;

  const pct = Math.round((status.completedCount / status.totalCount) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Get started with Prism</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {status.completedCount} of {status.totalCount} steps complete
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none transition-colors"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {status.steps.map((step) => {
          const href = STEP_LINKS[step.id];
          const content = (
            <div
              key={step.id}
              className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                step.done ? 'opacity-60' : href ? 'hover:bg-slate-50 cursor-pointer' : ''
              }`}
            >
              {/* Check circle */}
              <div
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  step.done
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300'
                }`}
              >
                {step.done && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                )}
              </div>

              {/* Arrow */}
              {!step.done && href && (
                <svg className="shrink-0 w-4 h-4 text-slate-400 mt-0.5" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );

          return !step.done && href ? (
            <Link key={step.id} href={href} className="block">
              {content}
            </Link>
          ) : (
            <div key={step.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
