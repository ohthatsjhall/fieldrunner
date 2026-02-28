import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrgDashboardContent } from '../components/org-dashboard-content';

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  const { slug } = await params;

  if (!userId) {
    redirect('/sign-in');
  }

  return <OrgDashboardContent slug={slug} />;
}
