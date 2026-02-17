import { auth } from '@clerk/nextjs/server';
import { OrganizationList } from '@clerk/nextjs';
import { OrgDashboardContent } from './components/org-dashboard-content';

export default async function OrgDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId, orgId, orgSlug, orgRole } = await auth();
  const { slug } = await params;

  // Token hasn't refreshed yet — use client component to wait for Clerk to load
  if (!orgSlug) {
    return <OrgDashboardContent slug={slug} />;
  }

  // Org mismatch — show recovery UI
  if (orgSlug !== slug) {
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

  // Happy path
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
