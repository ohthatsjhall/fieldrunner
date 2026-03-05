'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyTimeToClose } from '@fieldrunner/shared';
import { ChartCard } from './chart-card';

export function TimeToCloseChart({ data }: { data: MonthlyTimeToClose[] }) {
  return (
    <ChartCard
      title="Time to Close"
      description="Average days from creation to closure per month"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 8,
              color: 'var(--card-foreground)',
            }}
            formatter={(value) => [`${value} days`, 'Avg Time to Close']}
          />
          <Line
            type="monotone"
            dataKey="avgDays"
            name="Avg Days"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
