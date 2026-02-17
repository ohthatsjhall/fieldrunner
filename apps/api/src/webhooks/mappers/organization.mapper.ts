import type { OrganizationJSON } from '@clerk/backend';

/**
 * Maps a Clerk organization webhook payload to Drizzle insert values.
 * Clerk timestamps are Unix milliseconds; we convert them to Date objects.
 */
export function mapOrganizationPayload(data: OrganizationJSON) {
  return {
    clerkId: data.id,
    name: data.name,
    slug: data.slug,
    imageUrl: data.image_url,
    hasImage: data.has_image,
    createdBy: data.created_by,
    maxAllowedMemberships: data.max_allowed_memberships,
    membersCount: data.members_count ?? 0,
    pendingInvitationsCount: data.pending_invitations_count ?? 0,
    adminDeleteEnabled: data.admin_delete_enabled,
    publicMetadata: data.public_metadata as Record<string, unknown>,
    privateMetadata: data.private_metadata as Record<string, unknown>,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
