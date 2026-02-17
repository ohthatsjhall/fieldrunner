import type { OrganizationMembershipJSON } from '@clerk/backend';

/**
 * Maps a Clerk organization membership webhook payload to Drizzle insert values.
 * Returns clerkOrganizationId and clerkUserId for FK resolution by the caller.
 * Clerk timestamps are Unix milliseconds; we convert them to Date objects.
 */
export function mapMembershipPayload(data: OrganizationMembershipJSON) {
  return {
    clerkId: data.id,
    clerkOrganizationId: data.organization.id,
    clerkUserId: data.public_user_data.user_id,
    role: data.role,
    roleName:
      ((data as unknown as Record<string, unknown>).role_name as string) ??
      null,
    permissions: data.permissions ?? null,
    publicMetadata: data.public_metadata as Record<string, unknown>,
    privateMetadata: (data.private_metadata ?? null) as Record<
      string,
      unknown
    > | null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
