'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/app/components/ui/dropdown-menu';
import { useAnalyticsDashboard } from '@/hooks/queries';
import { WeeklySnapshot } from './weekly-snapshot';
import { TicketVolumeChart } from './ticket-volume-chart';
import { StageDurationChart } from './stage-duration-chart';
import { ResolutionRateChart } from './resolution-rate-chart';
import { TimeToCloseChart } from './time-to-close-chart';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '1m', label: 'Last month' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
] as const;

export function AnalyticsDashboard() {
  const [range, setRange] = useState('all');
  const { data, isLoading, error, isFetching } = useAnalyticsDashboard(range);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? 'All time';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-title text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[380px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-title text-2xl font-bold">Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.ticketVolume.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-title text-2xl font-bold">Dashboard</h1>
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No data yet
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sync your service requests from BlueFolder to see analytics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-title text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {isFetching && (
            <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900">
                <CalendarDays className="size-4" />
                {rangeLabel}
                <ChevronDown className="size-3.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={range} onValueChange={setRange}>
                {RANGE_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <WeeklySnapshot data={data.snapshot} />
      {/* key={range} forces remount → recharts replays entry animations */}
      <div key={range} className="grid gap-6 lg:grid-cols-2">
        <TicketVolumeChart data={data.ticketVolume} />
        <StageDurationChart data={data.stageDurations} />
        <ResolutionRateChart data={data.resolutionRate} />
        <TimeToCloseChart data={data.timeToClose} />
      </div>
    </div>
  );
}
