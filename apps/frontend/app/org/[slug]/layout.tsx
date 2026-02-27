import { auth } from '@clerk/nextjs/server';
import { OrganizationList } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { OrgNavbar } from './components/org-navbar';

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
          afterSelectOrganizationUrl="/org/:slug"
          afterCreateOrganizationUrl="/org/:slug"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <OrgNavbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
