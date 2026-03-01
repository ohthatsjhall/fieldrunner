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

// -- Column header with sort + optional filter dropdown --

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
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1 size-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1 size-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 size-3.5" />
      )}
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

// -- Badge components (moved from org-dashboard-content) --

export function StatusBadge({ status }: { status: string }) {
  const lower = String(status ?? '').toLowerCase();
  let classes = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  if (lower === 'new')
    classes = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (lower === 'in progress')
    classes = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (lower === 'closed')
    classes = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const lower = String(priority ?? '').toLowerCase();
  let classes = 'text-zinc-500';
  if (lower === 'high' || lower === 'urgent')
    classes = 'text-red-600 dark:text-red-400 font-medium';
  if (lower === 'normal') classes = 'text-zinc-600 dark:text-zinc-400';
  if (lower === 'low') classes = 'text-zinc-400';

  return <span className={`text-sm ${classes}`}>{priority}</span>;
}
