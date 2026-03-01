import { Skeleton } from '@/app/components/ui/skeleton';

export function SrLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Skeleton className="h-4 w-48" />

      {/* Title + badges */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Description */}
      <Skeleton className="h-4 w-96" />

      {/* Tabs */}
      <Skeleton className="h-9 w-64" />

      {/* Two-column cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>

      {/* Financials row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </div>
  );
}
