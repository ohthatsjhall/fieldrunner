import Link from 'next/link';
import { ChevronRight, Home, User } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { StatusBadge } from '@/app/org/[slug]/components/columns';
import type { ServiceRequestDetail } from '@fieldrunner/shared';

function getAssigneeName(sr: ServiceRequestDetail): string | null {
  for (const a of sr.assignments) {
    if (a.assigneeUserNames.length > 0) return a.assigneeUserNames[0];
  }
  return null;
}

export function SrHeader({
  sr,
  slug,
}: {
  sr: ServiceRequestDetail;
  slug: string;
}) {
  const assignee = getAssigneeName(sr);

  return (
    <div>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex">
        <ol role="list" className="flex items-center space-x-4">
          <li>
            <Link
              href={`/org/${slug}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground/50"
              />
              <Link
                href={`/org/${slug}/requests`}
                className="ml-4 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Requests
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground/50"
              />
              <span
                aria-current="page"
                className="ml-4 text-sm font-medium text-foreground"
              >
                SR #{sr.serviceRequestId}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Sticky title row */}
      <div className="sticky top-0 z-10 bg-background pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-title text-3xl font-bold">
              SR #{sr.serviceRequestId}
            </h1>
            <StatusBadge status={sr.status} />
            {sr.isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>

          {assignee && (
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                <User className="size-4 text-muted-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                {assignee}
              </span>
            </div>
          )}
        </div>

        {/* Metadata bar */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {sr.type && (
            <span>
              <span className="text-muted-foreground">Type</span>{' '}
              <span className="font-semibold text-foreground">{sr.type}</span>
            </span>
          )}
          {sr.priority && (
            <>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>
                <span className="text-muted-foreground">Priority</span>{' '}
                <span className="font-semibold text-foreground">
                  {sr.priority}
                </span>
              </span>
            </>
          )}
          {sr.customerName && (
            <>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>
                <span className="text-muted-foreground">Customer</span>{' '}
                <span className="font-semibold text-foreground">
                  {sr.customerName}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {sr.description && (
        <p className="text-base text-zinc-500 dark:text-zinc-400">{sr.description}</p>
      )}
      {sr.detailedDescription && (
        <p className="mt-2 whitespace-pre-line text-sm text-zinc-500 dark:text-zinc-400">
          {sr.detailedDescription}
        </p>
      )}
    </div>
  );
}
