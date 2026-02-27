'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import type { ServiceRequestSummary } from '@fieldrunner/shared';

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

function ServiceRequestTable({
  items,
  slug,
}: {
  items: ServiceRequestSummary[];
  slug: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">No service requests match your filters.</p>
      </div>
    );
  }

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
              key={sr.serviceRequestId}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/org/${slug}/service-requests/${sr.serviceRequestId}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  #{sr.serviceRequestId}
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
  const { getToken } = useAuth();
  const hasFetched = useRef(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Derive unique statuses from the data
  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const sr of serviceRequests) {
      if (sr.status) set.add(sr.status);
    }
    return Array.from(set).sort();
  }, [serviceRequests]);

  // Client-side filter
  const filtered = useMemo(() => {
    if (!statusFilter) return serviceRequests;
    return serviceRequests.filter((sr) => sr.status === statusFilter);
  }, [serviceRequests, statusFilter]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const [statsRes, srRes] = await Promise.all([
          fetch(`${API_BASE_URL}/bluefolder/stats`, { headers }),
          fetch(`${API_BASE_URL}/bluefolder/service-requests`, { headers }),
        ]);

        if (!statsRes.ok || !srRes.ok) {
          throw new Error(`API error: ${statsRes.status} / ${srRes.status}`);
        }

        setStats(await statsRes.json());
        setServiceRequests(await srRes.json());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Requests</h1>
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
      </div>

      {stats && <StatsCards stats={stats} />}

      <ServiceRequestTable items={filtered} slug={slug} />
    </div>
  );
}
