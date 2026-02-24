import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrgSelector } from './components/org-selector';

export default async function OrgPage() {
  const { orgSlug, userId } = await auth();

  // Fast path: org already active in the session token
  if (orgSlug) {
    redirect(`/org/${orgSlug}`);
  }

  // orgSlug missing (slugs disabled, or org not yet activated in session).
  // Query Clerk API server-side to find the user's orgs — avoids the
  // client-side SDK initialization issue that causes blank pages after SSO.
  if (userId) {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
    });

    if (memberships.data.length > 0) {
      const org = memberships.data[0].organization;
      redirect(`/org/${org.slug}`);
    }
  }

  // No orgs yet — show Clerk's org creation/selection UI
  return <OrgSelector />;
}
