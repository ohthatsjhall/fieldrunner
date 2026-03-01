import { auth } from '@clerk/nextjs/server';
import { OrganizationList } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { AppSidebar } from './components/app-sidebar';
import { SyncActiveOrg } from './components/sync-active-org';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { userId, orgSlug } = await auth();
  const { slug } = await params;

  if (!userId) {
    redirect('/sign-in');
  }

  if (slug !== orgSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <OrganizationList
          hidePersonal
          hideSlug
          afterSelectOrganizationUrl="/org/:slug"
          afterCreateOrganizationUrl="/org/:slug"
        />
      </div>
    );
  }

  return (
    <>
      <SyncActiveOrg />
      <AppSidebar slug={slug}>{children}</AppSidebar>
    </>
  );
}
