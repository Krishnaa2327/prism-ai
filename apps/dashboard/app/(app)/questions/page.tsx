'use client';
import { useEffect, useState } from 'react';
import { api, IntentQuestion } from '@/lib/api';

const INTENT_LABELS: Record<string, string> = {
  how_to: 'How-to',
  stuck: 'Stuck / blocked',
  navigation: 'Navigation',
  question: 'General question',
  other: 'Other',
};

const INTENT_ORDER = ['how_to', 'stuck', 'navigation', 'question', 'other'];

type GroupedIntent = {
  intent: string;
  label: string;
  total: number;
  questions: IntentQuestion[];
};

export default function QuestionsPage() {
  const [groups, setGroups] = useState<GroupedIntent[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [openIntent, setOpenIntent] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.analytics.intents(days).then((res) => {
      const byIntent: Record<string, IntentQuestion[]> = {};
      for (const q of res.questions) {
        if (!byIntent[q.intent]) byIntent[q.intent] = [];
        byIntent[q.intent].push(q);
      }

      const sorted = INTENT_ORDER
        .filter((k) => byIntent[k]?.length)
        .map((k) => ({
          intent: k,
          label: INTENT_LABELS[k] ?? k,
          total: byIntent[k].reduce((s, q) => s + q.count, 0),
          questions: byIntent[k].sort((a, b) => b.count - a.count),
        }));

      setGroups(sorted);
      setTotalMessages(res.totalMessages);
      if (sorted.length > 0 && !openIntent) setOpenIntent(sorted[0].intent);
    }).finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Questions</h1>
          <p className="text-slate-500 text-sm mt-1">
            Every question, clustered by intent. Gaps revealed in users' own words.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex gap-6">
          {/* Intent category list */}
          <div className="w-72 flex-shrink-0 space-y-1">
            {groups.map((g) => (
              <button
                key={g.intent}
                onClick={() => setOpenIntent(g.intent)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                  openIntent === g.intent
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{g.label}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    openIntent === g.intent
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {g.total} questions
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {g.questions[0]?.raw}
                </p>
              </button>
            ))}
          </div>

          {/* Question detail panel */}
          <div className="flex-1 min-w-0">
            {groups.map((g) => g.intent === openIntent && (
              <div key={g.intent} className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-800">{g.label}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {g.total} questions across {g.questions.length} variations
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {g.questions.map((q, i) => (
                    <div key={i} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-slate-700 leading-relaxed">"{q.raw}"</p>
                        <span className="flex-shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
                          ×{q.count}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        Last asked {fmtRelative(q.lastSeen)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && totalMessages > 0 && (
        <p className="text-xs text-slate-400 mt-6 text-center">
          Analysed {totalMessages.toLocaleString()} messages over the last {days} days
        </p>
      )}
    </div>
  );
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <p className="text-4xl mb-4">💬</p>
      <h2 className="text-base font-semibold text-slate-800 mb-2">No questions yet</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        Once users start chatting with your AI assistant, their questions will appear here, clustered by intent.
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex gap-6 animate-pulse">
      <div className="w-72 space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
      </div>
      <div className="flex-1 space-y-3">
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}
