'use client';

import type { WeeklySnapshot as WeeklySnapshotData } from '@fieldrunner/shared';

const cards = [
  { key: 'createdThisWeek' as const, label: 'Created This Week', color: 'text-blue-600 dark:text-blue-400' },
  { key: 'closedThisWeek' as const, label: 'Closed This Week', color: 'text-green-600 dark:text-green-400' },
  { key: 'totalOpen' as const, label: 'Total Open', color: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'inProgress' as const, label: 'In Progress', color: 'text-violet-600 dark:text-violet-400' },
  { key: 'avgDaysToClose' as const, label: 'Avg Days to Close', color: 'text-zinc-900 dark:text-zinc-100' },
];

export function WeeklySnapshot({ data }: { data: WeeklySnapshotData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((card) => {
        const raw = data[card.key];
        const value = raw == null ? '\u2014' : raw;

        return (
          <div
            key={card.key}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {card.label}
            </p>
            <p className={`font-title text-3xl font-bold tabular-nums ${card.color}`}>
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
