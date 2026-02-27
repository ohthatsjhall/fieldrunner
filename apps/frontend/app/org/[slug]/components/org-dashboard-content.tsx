'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import type { ServiceRequest } from '@fieldrunner/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Stats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Total', value: stats.total, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: 'Open', value: stats.open, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Closed', value: stats.closed, color: 'text-green-600 dark:text-green-400' },
    { label: 'Overdue', value: stats.overdue, color: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = String(status ?? '').toLowerCase();
  let classes = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  if (lower === 'new') classes = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (lower === 'in progress') classes = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (lower === 'closed') classes = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const lower = String(priority ?? '').toLowerCase();
  let classes = 'text-zinc-500';
  if (lower === 'high' || lower === 'urgent') classes = 'text-red-600 dark:text-red-400 font-medium';
  if (lower === 'normal') classes = 'text-zinc-600 dark:text-zinc-400';
  if (lower === 'low') classes = 'text-zinc-400';

  return <span className={`text-sm ${classes}`}>{priority}</span>;
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

function ServiceRequestTable({
  items,
  slug,
}: {
  items: ServiceRequest[];
  slug: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">ID</th>
            <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Description</th>
            <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Customer</th>
            <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
            <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Priority</th>
            <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {items.map((sr) => (
            <tr
              key={sr.bluefolderId}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/org/${slug}/service-requests/${sr.bluefolderId}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  #{sr.bluefolderId}
                </Link>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-zinc-900 dark:text-zinc-100">
                {sr.description}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {sr.customerName}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={sr.status} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={sr.priority} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                {sr.dateTimeCreated
                  ? new Date(sr.dateTimeCreated).toLocaleDateString()
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrgDashboardContent({ slug }: { slug: string }) {
  const { getToken, orgId } = useAuth();
  const orgReady = !!orgId;

  const [stats, setStats] = useState<Stats | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const sr of serviceRequests) {
      if (sr.status) set.add(sr.status);
    }
    return Array.from(set).sort();
  }, [serviceRequests]);

  const filtered = useMemo(() => {
    if (!statusFilter) return serviceRequests;
    return serviceRequests.filter((sr) => sr.status === statusFilter);
  }, [serviceRequests, statusFilter]);

  const getHeaders = useCallback(async () => {
    const token = await getToken({ skipCache: true });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [getToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();

      const [statsRes, srRes, syncStatusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bluefolder/stats`, { headers }),
        fetch(`${API_BASE_URL}/bluefolder/service-requests`, { headers }),
        fetch(`${API_BASE_URL}/bluefolder/sync-status`, { headers }),
      ]);

      if (!statsRes.ok || !srRes.ok) {
        throw new Error(`API error: ${statsRes.status} / ${srRes.status}`);
      }

      setStats(await statsRes.json());
      setServiceRequests(await srRes.json());

      if (syncStatusRes.ok) {
        const syncData = await syncStatusRes.json();
        setLastSyncedAt(syncData.lastSyncedAt ?? null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/bluefolder/sync`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        throw new Error(`Sync failed: ${res.status}`);
      }
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
    } finally {
      setSyncing(false);
    }
  }, [getHeaders, fetchData]);

  useEffect(() => {
    if (!orgReady) return;
    fetchData();
  }, [orgReady, fetchData]);

  const hasData = serviceRequests.length > 0;

  return (
    <div className="space-y-6">
      {/* Header + sync button — ALWAYS visible */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Requests</h1>
        <div className="flex items-center gap-3">
          {lastSyncedAt && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Last synced: {formatTimeAgo(lastSyncedAt)}
            </span>
          )}
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

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">All statuses ({serviceRequests.length})</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s} ({serviceRequests.filter((sr) => sr.status === s).length})
                </option>
              ))}
            </select>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>

          <ServiceRequestTable items={filtered} slug={slug} />
        </>
      )}
    </div>
  );
}
