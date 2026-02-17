'use client';

import { OrganizationSwitcher, UserButton, useAuth } from '@clerk/nextjs';

export function OrgNavbar() {
  const { isLoaded } = useAuth();

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Fieldrunner</span>
          {isLoaded ? (
            <OrganizationSwitcher
              afterSelectOrganizationUrl="/org/:slug"
              afterCreateOrganizationUrl="/org/:slug"
            />
          ) : (
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          )}
        </div>
        {isLoaded ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        )}
      </div>
    </nav>
  );
}
