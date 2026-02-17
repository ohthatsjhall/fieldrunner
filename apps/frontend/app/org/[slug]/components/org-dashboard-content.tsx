'use client';

import { useAuth } from '@clerk/nextjs';
import { OrganizationList } from '@clerk/nextjs';

export function OrgDashboardContent({ slug }: { slug: string }) {
  const { isLoaded, orgSlug, userId, orgId, orgRole } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 text-zinc-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        Loading organization...
      </div>
    );
  }

  if (orgSlug === slug) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Welcome to your organization dashboard.
        </p>
        <pre className="mt-4 rounded bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
          {JSON.stringify({ userId, orgId, orgSlug, orgRole }, null, 2)}
        </pre>
      </div>
    );
  }

  // orgSlug doesn't match — show recovery UI
  return (
    <div>
      <h1 className="text-2xl font-bold">Organization not found</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Select an organization to continue.
      </p>
      <div className="mt-4">
        <OrganizationList
          afterSelectOrganizationUrl="/org/:slug"
          afterCreateOrganizationUrl="/org/:slug"
        />
      </div>
    </div>
  );
}
