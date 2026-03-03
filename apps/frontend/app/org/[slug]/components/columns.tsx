'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter } from 'lucide-react';
import type { ServiceRequest } from '@fieldrunner/shared';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp className="ml-1 size-3.5" />;
  if (direction === 'desc') return <ArrowDown className="ml-1 size-3.5" />;
  return <ArrowUpDown className="ml-1 size-3.5" />;
}

function SortButton({ column, label }: { column: Column<ServiceRequest>; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-secondary hover:text-secondary-foreground"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      <SortIcon direction={sorted} />
    </Button>
  );
}

function FilterableHeader({
  column,
  label,
  values,
}: {
  column: Column<ServiceRequest>;
  label: string;
  values: string[];
}) {
  const filterValue = (column.getFilterValue() as string[] | undefined) ?? [];
  const isFiltered = filterValue.length > 0;

  return (
    <div className="flex items-center gap-1">
      <SortButton column={column} label={label} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="shrink-0 hover:bg-secondary">
            <ListFilter
              className={`size-3.5 ${isFiltered ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {values.map((value) => {
            const checked = filterValue.includes(value);
            return (
              <DropdownMenuCheckboxItem
                key={value}
                checked={checked}
                onCheckedChange={(isChecked) => {
                  const next = isChecked
                    ? [...filterValue, value]
                    : filterValue.filter((v) => v !== value);
                  column.setFilterValue(next.length ? next : undefined);
                }}
              >
                {value}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Custom filter fn for multi-value checkbox filtering
function multiValueFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: string[],
) {
  if (!filterValue || filterValue.length === 0) return true;
  const value = row.getValue(columnId) as string;
  return filterValue.includes(value);
}

// -- Hook that returns columns (needs data for unique filter values) --

export function useServiceRequestColumns(data: ServiceRequest[]) {
  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const sr of data) if (sr.status) set.add(sr.status);
    return Array.from(set).sort();
  }, [data]);

  const uniquePriorities = useMemo(() => {
    const set = new Set<string>();
    for (const sr of data) if (sr.priority) set.add(sr.priority);
    return Array.from(set).sort();
  }, [data]);

  const columns: ColumnDef<ServiceRequest>[] = useMemo(
    () => [
      {
        accessorKey: 'bluefolderId',
        header: ({ column }) => <SortButton column={column} label="ID" />,
        cell: ({ row, table }) => {
          const id = row.original.bluefolderId;
          const slug = (table.options.meta as { slug: string })?.slug ?? '';
          return (
            <Link
              href={`/org/${slug}/service-requests/${id}`}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              #{id}
            </Link>
          );
        },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <SortButton column={column} label="Description" />,
        cell: ({ row }) => (
          <span className="block max-w-xs truncate text-foreground">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => <SortButton column={column} label="Customer" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.customerName}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <FilterableHeader column={column} label="Status" values={uniqueStatuses} />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: multiValueFilter,
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <FilterableHeader column={column} label="Priority" values={uniquePriorities} />
        ),
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
        filterFn: multiValueFilter,
      },
      {
        accessorKey: 'dateTimeCreated',
        header: ({ column }) => <SortButton column={column} label="Created" />,
        cell: ({ row }) => {
          const d = row.original.dateTimeCreated;
          return (
            <span className="whitespace-nowrap text-muted-foreground">
              {d ? new Date(d).toLocaleDateString() : '-'}
            </span>
          );
        },
      },
    ],
    [uniqueStatuses, uniquePriorities],
  );

  return columns;
}

// -- Badge components --

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  proposed: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  assigned: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'in progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'job costing': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  'work complete': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'waiting on invoice': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'wo needs fix': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const DEFAULT_STATUS_COLOR = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

const STATUS_BORDER_COLORS: Record<string, string> = {
  new: 'border-l-blue-500/25',
  proposed: 'border-l-violet-500/25',
  assigned: 'border-l-indigo-500/25',
  'in progress': 'border-l-yellow-500/25',
  'job costing': 'border-l-zinc-400/25',
  'work complete': 'border-l-emerald-500/25',
  'waiting on invoice': 'border-l-sky-500/25',
  'wo needs fix': 'border-l-rose-500/25',
  cancelled: 'border-l-red-500/25',
  closed: 'border-l-green-500/25',
};

const DEFAULT_STATUS_BORDER = 'border-l-zinc-300/25 dark:border-l-zinc-600/25';

export function getStatusBorderColor(status: string): string {
  const lower = String(status ?? '').toLowerCase();
  return STATUS_BORDER_COLORS[lower] ?? DEFAULT_STATUS_BORDER;
}

export function StatusBadge({ status }: { status: string }) {
  const lower = String(status ?? '').toLowerCase();
  const classes = STATUS_COLORS[lower] ?? DEFAULT_STATUS_COLOR;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600 dark:text-red-400 font-medium',
  urgent: 'text-red-600 dark:text-red-400 font-medium',
  normal: 'text-zinc-600 dark:text-zinc-400',
  low: 'text-zinc-400',
};

const DEFAULT_PRIORITY_COLOR = 'text-zinc-500';

export function PriorityBadge({ priority }: { priority: string }) {
  const lower = String(priority ?? '').toLowerCase();
  const classes = PRIORITY_COLORS[lower] ?? DEFAULT_PRIORITY_COLOR;

  return <span className={`text-sm ${classes}`}>{priority}</span>;
}
