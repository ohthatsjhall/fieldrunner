import type { OrganizationInvitationJSON } from '@clerk/backend';

/**
 * Maps a Clerk organization invitation webhook payload to Drizzle insert values.
 * Returns clerkOrganizationId for FK resolution by the caller.
 * Clerk timestamps are Unix milliseconds; we convert them to Date objects.
 */
export function mapInvitationPayload(data: OrganizationInvitationJSON) {
  return {
    clerkId: data.id,
    clerkOrganizationId: data.organization_id,
    emailAddress: data.email_address,
    role: data.role,
    roleName: data.role_name ?? null,
    status: (data.status ?? 'pending') as string,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    publicMetadata: (data.public_metadata ?? null) as Record<
      string,
      unknown
    > | null,
    privateMetadata: (data.private_metadata ?? null) as Record<
      string,
      unknown
    > | null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
