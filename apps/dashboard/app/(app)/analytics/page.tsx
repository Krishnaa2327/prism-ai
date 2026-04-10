'use client';
import { useEffect, useState } from 'react';
import { api, TimelinePoint, TriggerStat, OverviewStats, IntentsResponse, IntentQuestion } from '@/lib/api';
import ConversationChart from '@/components/charts/ConversationChart';
import TriggerPieChart from '@/components/charts/TriggerPieChart';
import MetricCard from '@/components/MetricCard';

// ─── Intent category config ───────────────────────────────────────────────────
const INTENT_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  how_to:     { label: 'How-to',     color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-400'   },
  stuck:      { label: 'Stuck',      color: 'text-red-700',    bg: 'bg-red-50',    dot: 'bg-red-400'    },
  navigation: { label: 'Navigation', color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
  question:   { label: 'Question',   color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-400' },
  other:      { label: 'Other',      color: 'text-slate-600',  bg: 'bg-slate-100', dot: 'bg-slate-400'  },
};

function IntentBadge({ intent }: { intent: IntentQuestion['intent'] }) {
  const m = INTENT_META[intent];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ days }: { days: number }) {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [triggers, setTriggers] = useState<TriggerStat[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.analytics.timeline(days),
      api.analytics.triggers(),
      api.analytics.overview(),
    ]).then(([t, tr, s]) => { setTimeline(t); setTriggers(tr); setStats(s); })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}</div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Total Conversations" value={stats?.totalConversations ?? 0} icon="💬" />
        <MetricCard label="Active Users" value={stats?.activeUsers ?? 0} icon="👥" sub="Last 30 days" />
        <MetricCard label="Avg Messages / Conv" value={stats?.avgMessagesPerConv ?? 0} icon="📨" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Conversations per day</h2>
          <ConversationChart data={timeline} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Trigger breakdown</h2>
          {triggers.length > 0
            ? <TriggerPieChart data={triggers} />
            : <p className="text-slate-400 text-sm text-center py-16">No data yet</p>
          }
        </div>
      </div>

      {triggers.length > 0 && (
        <div className="mt-6 bg-brand-50 border border-brand-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-brand-700 mb-1">💡 Insight</h3>
          <p className="text-sm text-brand-600">
            {(() => {
              const top = [...triggers].sort((a, b) => b.count - a.count)[0];
              const label = { idle: 'idle users (30s+ on page)', exit_intent: 'exit intent (mouse leaving)', manual: 'manual opens' }[top.trigger] ?? top.trigger;
              return `Most conversations are triggered by ${label}. Consider adjusting your idle threshold or greeting message to improve engagement.`;
            })()}
          </p>
        </div>
      )}
    </>
  );
}

// ─── User Questions tab ───────────────────────────────────────────────────────
function IntentsTab({ days }: { days: number }) {
  const [data, setData] = useState<IntentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIntent, setFilterIntent] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api.analytics.intents(days).then(setData).finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}</div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const totalCategorised = Object.values(data.categorySummary).reduce((a, b) => a + b, 0);

  const filtered = data.questions.filter((q) => {
    if (filterIntent !== 'all' && q.intent !== filterIntent) return false;
    if (search && !q.raw.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const topQuestion = data.questions[0];

  return (
    <div className="space-y-6">
      {/* Category stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(INTENT_META).map(([key, m]) => {
          const count = data.categorySummary[key] ?? 0;
          const pct = totalCategorised > 0 ? Math.round((count / totalCategorised) * 100) : 0;
          return (
            <button
              key={key}
              onClick={() => setFilterIntent(filterIntent === key ? 'all' : key)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filterIntent === key
                  ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className={`text-xl font-bold ${m.color}`}>{count}</p>
              <p className="text-xs font-medium text-slate-600 mt-0.5">{m.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{pct}% of traffic</p>
            </button>
          );
        })}
      </div>

      {/* Insight callout */}
      {topQuestion && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-lg mt-0.5">💡</span>
          <div>
            <p className="text-sm font-semibold text-brand-700">Most asked question</p>
            <p className="text-sm text-brand-600 mt-0.5">
              "{topQuestion.raw}" — asked <strong>{topQuestion.count}×</strong>.
              {topQuestion.intent === 'stuck' && ' Your users are getting stuck here — consider adding a help tooltip or KB article.'}
              {topQuestion.intent === 'how_to' && ' This is a how-to gap — a short tutorial step in your flow could eliminate this question.'}
              {topQuestion.intent === 'navigation' && ' Users are struggling to find this — consider improving your UI wayfinding.'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search questions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
        />
        <span className="text-xs text-slate-400">
          {filtered.length} question{filtered.length !== 1 ? 's' : ''}
          {filterIntent !== 'all' ? ` · ${INTENT_META[filterIntent]?.label}` : ''}
        </span>
      </div>

      {/* Questions table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">
              {data.questions.length === 0
                ? 'No user messages yet — questions will appear here once users start chatting.'
                : 'No questions match your filter.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Question</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 text-right">Asked</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 max-w-md">
                    <p className="text-sm text-slate-800 leading-snug">{q.raw}</p>
                  </td>
                  <td className="px-4 py-3">
                    <IntentBadge intent={q.intent} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-slate-700">{q.count}</span>
                    <span className="text-xs text-slate-400 ml-1">×</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {timeAgo(q.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'questions'>('overview');
  const [days, setDays] = useState(30);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">How your AI agent is performing</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
        {([
          { key: 'overview',   label: 'Overview'        },
          { key: 'questions',  label: 'User Questions'  },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab  days={days} />}
      {tab === 'questions' && <IntentsTab   days={days} />}
    </div>
  );
}
