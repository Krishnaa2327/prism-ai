'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TriggerStat } from '@/lib/api';

const COLORS: Record<string, string> = {
  idle:        '#6366f1',
  exit_intent: '#f59e0b',
  manual:      '#10b981',
};
const LABELS: Record<string, string> = {
  idle:        'Idle (30s)',
  exit_intent: 'Exit Intent',
  manual:      'Manual',
};

export default function TriggerPieChart({ data }: { data: TriggerStat[] }) {
  const formatted = data.map((d) => ({
    name: LABELS[d.trigger] ?? d.trigger,
    value: d.count,
    color: COLORS[d.trigger] ?? '#94a3b8',
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          paddingAngle={3}
        >
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
