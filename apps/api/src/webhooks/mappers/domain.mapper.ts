import type { OrganizationDomainJSON } from '@clerk/backend';

/**
 * Maps a Clerk organization domain webhook payload to Drizzle insert values.
 * Returns clerkOrganizationId for FK resolution by the caller.
 * Clerk timestamps are Unix milliseconds; we convert them to Date objects.
 */
export function mapDomainPayload(data: OrganizationDomainJSON) {
  return {
    clerkId: data.id,
    clerkOrganizationId: data.organization_id,
    name: data.name,
    enrollmentMode: data.enrollment_mode as string,
    affiliationEmailAddress: data.affiliation_email_address ?? null,
    verification:
      (data.verification as unknown as Record<string, unknown>) ?? null,
    totalPendingInvitations: data.total_pending_invitations,
    totalPendingSuggestions: data.total_pending_suggestions,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
