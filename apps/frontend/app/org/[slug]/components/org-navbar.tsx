'use client';

import { UserButton, useOrganization } from '@clerk/nextjs';

export function OrgNavbar() {
  const { organization, isLoaded } = useOrganization();

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Fieldrunner</span>
          {isLoaded && organization ? (
            <div className="flex items-center gap-2">
              {organization.imageUrl ? (
                <img
                  src={organization.imageUrl}
                  alt={organization.name}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {organization.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {organization.name}
              </span>
            </div>
          ) : (
            <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
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
