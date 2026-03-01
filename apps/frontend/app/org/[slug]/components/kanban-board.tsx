'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import type { ServiceRequest, ServiceRequestStatus } from '@fieldrunner/shared';
import { StatusBadge, PriorityBadge } from './columns';

const STATUS_ORDER: ServiceRequestStatus[] = [
  'New',
  'Proposed',
  'Assigned',
  'In Progress',
  'Job Costing',
  'Work Complete',
  'Waiting On Invoice',
  'WO Needs Fix',
  'Cancelled',
];

const CLOSED_STATUS = 'Closed';

function getStatusSortKey(status: string): number {
  const idx = STATUS_ORDER.findIndex(
    (s) => s.toLowerCase() === status.toLowerCase(),
  );
  if (idx !== -1) return idx;
  if (status.toLowerCase() === CLOSED_STATUS.toLowerCase()) return 9999;
  return 1000; // unknown statuses sort alphabetically between known and Closed
}

function groupByStatus(requests: ServiceRequest[]): Map<string, ServiceRequest[]> {
  const groups = new Map<string, ServiceRequest[]>();
  for (const sr of requests) {
    const status = sr.status || 'Unknown';
    const list = groups.get(status) ?? [];
    list.push(sr);
    groups.set(status, list);
  }
  return groups;
}

const PRIORITY_BORDER_COLORS: Record<string, string> = {
  high: 'border-l-red-500',
  urgent: 'border-l-red-500',
  normal: 'border-l-amber-400',
};

const DEFAULT_PRIORITY_BORDER = 'border-l-zinc-300 dark:border-l-zinc-600';

function getPriorityBorderColor(priority: string): string {
  const lower = String(priority ?? '').toLowerCase();
  return PRIORITY_BORDER_COLORS[lower] ?? DEFAULT_PRIORITY_BORDER;
}

function KanbanCard({ sr }: { sr: ServiceRequest }) {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const detailUrl = `/org/${slug}/service-requests/${sr.bluefolderId}`;

  return (
    <div
      onClick={() => router.push(detailUrl)}
      className={`group cursor-pointer rounded-md border border-l-[3px] bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${getPriorityBorderColor(sr.priority)}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <Link
          href={detailUrl}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          #{sr.bluefolderId}
        </Link>
        {sr.isOverdue && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            Overdue
          </span>
        )}
      </div>

      <p className="mb-2 line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
        {sr.description || 'No description'}
      </p>

      <div className="mb-2 flex items-center gap-1.5">
        <Building2 className="size-3 shrink-0 text-muted-foreground/60" />
        <span className="truncate text-xs text-muted-foreground">
          {sr.customerName}
        </span>
      </div>

      <div className="flex items-center">
        <PriorityBadge priority={sr.priority} />
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  requests,
}: {
  status: string;
  requests: ServiceRequest[];
}) {
  return (
    <div className="flex w-60 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <StatusBadge status={status} />
        <span className="text-sm font-medium text-muted-foreground">
          {requests.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {requests.map((sr) => (
          <KanbanCard key={sr.id} sr={sr} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ requests }: { requests: ServiceRequest[] }) {
  const groups = groupByStatus(requests);

  const sortedStatuses = Array.from(groups.keys()).sort((a, b) => {
    const ka = getStatusSortKey(a);
    const kb = getStatusSortKey(b);
    if (ka !== kb) return ka - kb;
    return a.localeCompare(b);
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {sortedStatuses.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          requests={groups.get(status)!}
        />
      ))}
    </div>
  );
}
