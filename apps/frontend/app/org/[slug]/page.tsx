import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="space-y-6">
      <h1 className="font-title text-2xl font-bold">Dashboard</h1>
      <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Coming soon
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The dashboard is under construction.
        </p>
      </div>
    </div>
  );
}
