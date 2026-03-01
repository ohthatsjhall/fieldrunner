'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { TableProperties, Columns3 } from 'lucide-react';
import { useApiClient } from '@/lib/api-client-browser';
import type { ServiceRequest } from '@fieldrunner/shared';
import { cn } from '@/lib/utils';
import { DataTable } from './data-table';
import { useServiceRequestColumns } from './columns';
import { KanbanBoard } from './kanban-board';

interface Stats {
  newCount: number;
  inProgress: number;
  assigned: number;
  open: number;
}

function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'New', value: stats.newCount, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Assigned', value: stats.assigned, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'In Progress', value: stats.inProgress, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Open', value: stats.open, color: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{card.label}</p>
          <p className={`font-title text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function OrgDashboardContent({ slug }: { slug: string }) {
  const { orgId } = useAuth();
  const orgReady = !!orgId;
  const router = useRouter();
  const { apiFetch } = useApiClient();

  const [stats, setStats] = useState<Stats | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideClosed, setHideClosed] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    if (typeof window === 'undefined') return 'table';
    const saved = localStorage.getItem('sr-view-mode');
    return saved === 'kanban' ? 'kanban' : 'table';
  });

  const handleViewMode = useCallback((mode: 'table' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('sr-view-mode', mode);
  }, []);

  const visibleRequests = useMemo(
    () =>
      hideClosed
        ? serviceRequests.filter((sr) => sr.status?.toLowerCase() !== 'closed')
        : serviceRequests,
    [serviceRequests, hideClosed],
  );

  const columns = useServiceRequestColumns(visibleRequests);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, srData] = await Promise.all([
        apiFetch<Stats>('/bluefolder/stats'),
        apiFetch<ServiceRequest[]>('/bluefolder/service-requests'),
      ]);

      setStats(statsData);
      setServiceRequests(srData);

      // Sync status is non-critical — don't fail the whole load if it errors
      try {
        const syncData = await apiFetch<{ lastSyncedAt: string | null }>('/bluefolder/sync-status');
        setLastSyncedAt(syncData.lastSyncedAt ?? null);
      } catch {
        // ignore sync-status failures
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch<void>('/bluefolder/sync', { method: 'POST' });
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
    } finally {
      setSyncing(false);
    }
  }, [apiFetch, fetchData]);

  useEffect(() => {
    if (!orgReady) return;
    fetchData();
  }, [orgReady, fetchData]);

  const hasData = serviceRequests.length > 0;

  return (
    <div className="space-y-6">
      {/* Header + sync button — ALWAYS visible */}
      <div className="flex items-center justify-between">
        <h1 className="font-title text-2xl font-bold">Service Requests</h1>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {syncing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing...
              </>
            ) : (
              'Sync from BlueFolder'
            )}
          </button>
          {lastSyncedAt && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Last synced: {formatTimeAgo(lastSyncedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
        </>
      )}

      {/* Empty state */}
      {!loading && !hasData && !error && (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No data yet
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Click &quot;Sync from BlueFolder&quot; to fetch your service requests.
          </p>
        </div>
      )}

      {/* Data */}
      {!loading && hasData && (
        <>
          {stats && <StatsCards stats={stats} />}
          <div className="flex items-center justify-between">
            <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => handleViewMode('table')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900',
                )}
              >
                <TableProperties className="size-4" />
                Table
              </button>
              <button
                onClick={() => handleViewMode('kanban')}
                className={cn(
                  'inline-flex items-center gap-1.5 border-l border-zinc-200 px-3 py-1.5 text-sm font-medium transition-colors dark:border-zinc-800',
                  viewMode === 'kanban'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900',
                )}
              >
                <Columns3 className="size-4" />
                Board
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="group relative inline-flex w-11 shrink-0 rounded-full bg-zinc-200 p-0.5 inset-ring inset-ring-zinc-900/5 outline-offset-2 outline-primary transition-colors duration-200 ease-in-out has-checked:bg-primary has-focus-visible:outline-2 dark:bg-zinc-700 dark:inset-ring-white/5 dark:has-checked:bg-primary">
                <span className="size-5 rounded-full bg-white shadow-xs ring-1 ring-zinc-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5 dark:ring-white/10" />
                <input
                  type="checkbox"
                  checked={hideClosed}
                  onChange={(e) => setHideClosed(e.target.checked)}
                  className="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-hidden"
                />
              </div>
              <span className="text-sm text-muted-foreground">Hide closed</span>
            </div>
          </div>
          {viewMode === 'table' ? (
            <DataTable
              columns={columns}
              data={visibleRequests}
              meta={{ slug }}
              onRowClick={(sr) => router.push(`/org/${slug}/service-requests/${sr.bluefolderId}`)}
            />
          ) : (
            <KanbanBoard requests={visibleRequests} />
          )}
        </>
      )}
    </div>
  );
}
