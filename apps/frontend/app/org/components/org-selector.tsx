'use client';

import { OrganizationList } from '@clerk/nextjs';

export function OrgSelector() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <OrganizationList
        afterSelectOrganizationUrl="/org/:slug"
        afterCreateOrganizationUrl="/org/:slug"
      />
    </div>
  );
}
