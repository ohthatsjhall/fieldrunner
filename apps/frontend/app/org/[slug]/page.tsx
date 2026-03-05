import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from './components/dashboard/analytics-dashboard';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <AnalyticsDashboard />;
}
