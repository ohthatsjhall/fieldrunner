'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth, useOrganization, useUser } from '@clerk/nextjs';

const UserButton = dynamic(
  () => import('@clerk/nextjs').then((mod) => ({ default: mod.UserButton })),
  { ssr: false },
);
import { LayoutDashboard, ClipboardList, Menu } from 'lucide-react';
import { useApiClient } from '@/lib/api-client-browser';
import { Logo } from '@/app/components/logo';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function useNewRequestCount() {
  const { orgId } = useAuth();
  const { apiFetch } = useApiClient();
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    try {
      const data = await apiFetch<{ newCount: number }>('/bluefolder/stats');
      setCount(data.newCount ?? 0);
    } catch {
      // non-critical — don't break the sidebar
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!orgId) return;
    fetch();
  }, [orgId, fetch]);

  return count;
}

function useNavItems(slug: string): NavItem[] {
  const newCount = useNewRequestCount();
  return [
    { label: 'Dashboard', href: `/org/${slug}`, icon: LayoutDashboard },
    { label: 'Requests', href: `/org/${slug}/requests`, icon: ClipboardList, badge: newCount },
  ];
}

function isActive(pathname: string, href: string, slug: string) {
  if (href === `/org/${slug}`) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

function OrgInfo() {
  const { organization, isLoaded, membership } = useOrganization();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2.5 px-2">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (!organization) return null;

  const roleLabel = membership?.role === 'org:admin' ? 'Admin' : 'Member';

  return (
    <div className="flex items-center gap-2.5 px-2">
      {organization.imageUrl ? (
        <img
          src={organization.imageUrl}
          alt={organization.name}
          className="size-9 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {organization.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight text-foreground">
          {organization.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {roleLabel} &middot; {organization.membersCount} {organization.membersCount === 1 ? 'member' : 'members'}
        </span>
      </div>
    </div>
  );
}

function UserInfo() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'size-8',
          },
        }}
      />
      {user && (
        <div className="flex flex-col">
          <span className="text-sm font-medium leading-tight text-foreground">
            {user.fullName || user.firstName || 'User'}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      )}
    </div>
  );
}

function NavLinks({
  items,
  pathname,
  slug,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  slug: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href, slug);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
            )}
          >
            <item.icon
              className={cn(
                'size-[18px] shrink-0 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <Badge className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  slug,
  onNavigate,
}: {
  slug: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const navItems = useNavItems(slug);

  return (
    <div className="flex h-full flex-col">
      {/* Logo + Org */}
      <div className="flex flex-col gap-4 px-4 pt-5 pb-2">
        <Logo />
        <OrgInfo />
      </div>

      <Separator className="mx-4 my-2 w-auto" />

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks
          items={navItems}
          pathname={pathname}
          slug={slug}
          onNavigate={onNavigate}
        />
      </div>

      {/* Footer: user + theme toggle */}
      <div className="px-4 pb-4">
        <Separator className="mb-3" />
        <div className="flex items-center justify-between">
          <UserInfo />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

/** Mobile top bar — visible only on small screens */
function MobileHeader({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-sidebar px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.06)] lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground"
        onClick={onOpenSidebar}
      >
        <Menu className="size-5" />
        <span className="sr-only">Open sidebar</span>
      </Button>
      <Logo />
      <div className="ml-auto">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'size-8',
            },
          }}
        />
      </div>
    </header>
  );
}

export function AppSidebar({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar — fixed, shadow instead of border */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-sidebar shadow-[4px_0_24px_rgba(0,0,0,0.06)] lg:flex lg:flex-col">
        <SidebarContent slug={slug} />
      </aside>

      {/* Mobile sidebar — sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 bg-sidebar p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            slug={slug}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="lg:pl-64">
        <MobileHeader onOpenSidebar={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
