/**
 * Clerk's PermissionJSON is not re-exported from @clerk/backend's public API,
 * so we define the subset we need here.
 */
interface PermissionWebhookData {
  id: string;
  key: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
}

/**
 * Maps a Clerk permission webhook payload to Drizzle insert values.
 * Clerk timestamps are Unix milliseconds; we convert them to Date objects.
 * Note: schema has a `type` column but Clerk's permission payload doesn't include it.
 */
export function mapPermissionPayload(data: PermissionWebhookData) {
  return {
    clerkId: data.id,
    key: data.key,
    name: data.name,
    description: data.description ?? null,
    type: null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
