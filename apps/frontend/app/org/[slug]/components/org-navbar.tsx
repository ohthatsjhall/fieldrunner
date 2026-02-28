'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useOrganization } from '@clerk/nextjs';
import { Logo } from '../../../components/logo';

export function OrgNavbar() {
  const { organization, isLoaded } = useOrganization();
  const pathname = usePathname();
  const slug = organization?.slug ?? '';

  const navLinks = [
    { href: `/org/${slug}`, label: 'Dashboard' },
  ];

  function isActive(href: string) {
    if (href === `/org/${slug}`) {
      return pathname === href || pathname.startsWith(`/org/${slug}/service-requests`);
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo />
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
          {isLoaded && organization && (
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
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
