import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrgSelector } from './components/org-selector';

export default async function OrgPage() {
  const { orgSlug } = await auth();

  // Server-side redirect if org is already active in the token
  if (orgSlug) {
    redirect(`/org/${orgSlug}`);
  }

  // Client component handles Clerk loading, org creation, and redirect
  return <OrgSelector />;
}
