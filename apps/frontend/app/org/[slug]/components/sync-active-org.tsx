'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganizationList } from '@clerk/nextjs';

export function SyncActiveOrg() {
  const { slug } = useParams<{ slug: string }>();
  const { setActive, userMemberships, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || !setActive || !userMemberships.data) return;

    const match = userMemberships.data.find(
      (mem) => mem.organization.slug === slug,
    );

    if (match) {
      setActive({ organization: match.organization.id });
    }
  }, [slug, isLoaded, setActive, userMemberships.data]);

  return null;
}
