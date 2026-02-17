import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrgNavbar } from './components/org-navbar';

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
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
