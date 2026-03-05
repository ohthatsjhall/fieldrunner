'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyStageDuration } from '@fieldrunner/shared';
import { ChartCard } from './chart-card';

const STAGE_COLORS: Record<string, string> = {
  New: 'var(--chart-1)',
  Assigned: 'var(--chart-2)',
  'In Progress': 'var(--chart-3)',
  'Job Costing': 'var(--chart-4)',
  'Work Complete': 'var(--chart-5)',
  'Waiting On Invoice': 'oklch(0.7 0.15 200)',
  Proposed: 'oklch(0.6 0.1 260)',
  'Vendor Assigned': 'oklch(0.65 0.12 180)',
};

function StageDurationTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  // Filter out zero values and sort by hours descending
  const items = payload
    .filter((p: any) => p.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-md"
      style={{ borderColor: 'var(--border)' }}
    >
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="space-y-1">
        {items.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-muted-foreground">{item.dataKey}</span>
            <span className="ml-auto font-medium tabular-nums">
              {item.value >= 24
                ? `${Math.round((item.value / 24) * 10) / 10}d`
                : `${item.value}h`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageDurationChart({ data }: { data: MonthlyStageDuration[] }) {
  const { flat, stages } = useMemo(() => {
    const stageSet = new Set<string>();
    const flat = data.map((d) => {
      for (const key of Object.keys(d.stages)) stageSet.add(key);
      return { month: d.month, ...d.stages };
    });
    return { flat, stages: Array.from(stageSet) };
  }, [data]);

  return (
    <ChartCard
      title="Avg Time in Stage"
      description="Average hours spent in each status per month"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={flat} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <Tooltip content={<StageDurationTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
          {stages.map((stage) => (
            <Bar
              key={stage}
              dataKey={stage}
              stackId="a"
              fill={STAGE_COLORS[stage] ?? 'var(--chart-4)'}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
