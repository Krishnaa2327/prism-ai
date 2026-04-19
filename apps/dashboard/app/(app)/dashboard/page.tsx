'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api, OverviewStats, TimelinePoint, EndUserSummary, Insight } from '@/lib/api';

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [users, setUsers] = useState<{ users: EndUserSummary[]; total: number } | null>(null);
  const [topInsight, setTopInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.overview(),
      api.analytics.timeline(30),
      api.users.list({ limit: 10 }),
      api.insights.list().catch(() => null),
    ]).then(([o, t, u, ins]) => {
      setOverview(o);
      setTimeline(t);
      setUsers(u);
      if (ins && ins.insights.length > 0) setTopInsight(ins.insights[0]);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const totalMessages = overview
    ? Math.round((overview.avgMessagesPerConv ?? 0) * (overview.totalConversations ?? 0))
    : 0;

  const chartData = timeline.map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Conversations: p.conversations,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your AI assistant usage</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={users?.total ?? overview?.activeUsers ?? 0}
          checkmark
        />
        <StatCard
          label="Conversations"
          value={overview?.totalConversations ?? 0}
          checkmark
        />
        <StatCard
          label="Messages"
          value={totalMessages}
        />
      </div>

      {/* Usage over time chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Usage over time
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              labelStyle={{ color: '#475569', fontWeight: 600 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="Conversations"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top insight card */}
      {topInsight && (
        <div className={`rounded-xl border p-5 mb-6 flex items-start gap-4 ${
          topInsight.severity === 'high' ? 'border-red-200 bg-red-50' :
          topInsight.severity === 'medium' ? 'border-amber-200 bg-amber-50' :
          'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                topInsight.severity === 'high' ? 'bg-red-100 text-red-700' :
                topInsight.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>{topInsight.severity}</span>
              <span className="text-xs text-slate-400 font-medium">Top insight</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{topInsight.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{topInsight.description}</p>
          </div>
          <Link href="/insights" className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">
            View all →
          </Link>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Users</p>
          <Link href="/users" className="text-xs text-indigo-600 hover:underline font-medium">
            View all
          </Link>
        </div>
        {(users?.users.length ?? 0) === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No users yet. Install the widget to start tracking.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-400 px-6 py-3">User</th>
                <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Sessions</th>
                <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Completed</th>
                <th className="text-right text-xs font-medium text-slate-400 px-6 py-3">Messages</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {users?.users.map((u) => {
                const displayId = u.externalId ?? u.id.slice(0, 8);
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700 truncate max-w-[180px]">
                      {displayId}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{u.totalSessions}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{u.completedSessions}</td>
                    <td className="px-6 py-3 text-right text-slate-400">—</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/users`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        View sessions
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, checkmark }: { label: string; value: number; checkmark?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-1.5 mb-3">
        {checkmark && (
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M3.5 6l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 bg-slate-200 rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
      </div>
      <div className="h-64 bg-slate-200 rounded-xl" />
      <div className="h-48 bg-slate-200 rounded-xl" />
    </div>
  );
}
