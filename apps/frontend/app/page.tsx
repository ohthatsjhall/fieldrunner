import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const { userId, orgSlug } = await auth();

  if (userId && orgSlug) {
    redirect(`/org/${orgSlug}`);
  }

  if (userId) {
    redirect('/org');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Fieldrunner</h1>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-full bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full border border-zinc-300 px-6 py-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
