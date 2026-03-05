'use client';

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Label,
} from 'recharts';
import type { MonthlyResolutionRate } from '@fieldrunner/shared';
import { ChartCard } from './chart-card';

export function ResolutionRateChart({ data }: { data: MonthlyResolutionRate[] }) {
  return (
    <ChartCard
      title="Resolution Rate"
      description="Percentage of created tickets resolved each month"
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 8,
              color: 'var(--card-foreground)',
            }}
            formatter={(value) => [`${value}%`, 'Rate']}
          />
          {data.length > 0 && (
            <ReferenceArea
              y1={0}
              y2={50}
              fill="var(--destructive)"
              fillOpacity={0.06}
            />
          )}
          <ReferenceLine
            y={50}
            stroke="var(--destructive)"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          >
            <Label
              value="Below 50% threshold"
              position="insideBottomRight"
              style={{ fontSize: 11, fill: 'var(--destructive)', fontWeight: 500 }}
            />
          </ReferenceLine>
          <Line
            type="monotone"
            dataKey="rate"
            name="Resolution Rate"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
