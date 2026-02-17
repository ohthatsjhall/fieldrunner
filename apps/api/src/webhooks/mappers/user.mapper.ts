import type { UserJSON } from '@clerk/backend';

/**
 * Maps a Clerk user webhook payload to Drizzle insert values.
 * Clerk timestamps are Unix milliseconds; we convert them to Date objects.
 */
export function mapUserPayload(data: UserJSON) {
  const primaryEmail = data.primary_email_address_id
    ? data.email_addresses.find((ea) => ea.id === data.primary_email_address_id)
    : undefined;

  return {
    clerkId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: primaryEmail?.email_address ?? null,
    imageUrl: data.image_url,
    hasImage: data.has_image,
    username: data.username,
    passwordEnabled: data.password_enabled,
    twoFactorEnabled: data.two_factor_enabled,
    banned: data.banned,
    locked: data.locked,
    externalId: data.external_id,
    publicMetadata: data.public_metadata as Record<string, unknown>,
    privateMetadata: data.private_metadata as Record<string, unknown>,
    unsafeMetadata: data.unsafe_metadata as Record<string, unknown>,
    lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
    lastActiveAt: data.last_active_at ? new Date(data.last_active_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
