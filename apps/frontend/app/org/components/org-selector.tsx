'use client';

import { useAuth } from '@clerk/nextjs';
import { OrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function OrgSelector() {
  const { isLoaded, orgSlug } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && orgSlug) {
      router.push(`/org/${orgSlug}`);
    }
  }, [isLoaded, orgSlug, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          Loading...
        </div>
      </div>
    );
  }

  if (orgSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          Redirecting to organization...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <OrganizationList
        afterSelectOrganizationUrl="/org/:slug"
        afterCreateOrganizationUrl="/org/:slug"
      />
    </div>
  );
}
