'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyVolume } from '@fieldrunner/shared';
import { ChartCard } from './chart-card';

export function TicketVolumeChart({ data }: { data: MonthlyVolume[] }) {
  return (
    <ChartCard
      title="Ticket Volume"
      description="Monthly created vs. resolved service requests"
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 8,
              color: 'var(--card-foreground)',
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="created"
            name="Created"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Resolved"
            stroke="var(--chart-2)"
            fill="var(--chart-2)"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
