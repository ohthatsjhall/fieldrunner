/**
 * Query Key Factory
 *
 * Hierarchical key structure ensures that invalidating a parent key
 * automatically invalidates all children. Every key is org-scoped so
 * switching orgs in Clerk produces a full cache miss (no stale cross-org data).
 *
 * Pattern: `[domain, orgId, ...resource]`
 *
 * @example
 *   queryKeys.bluefolder.all(orgId)           // ["bluefolder", "org_abc"]
 *   queryKeys.bluefolder.stats(orgId)         // ["bluefolder", "org_abc", "stats"]
 *   queryKeys.bluefolder.serviceRequests.all(orgId)
 *     // ["bluefolder", "org_abc", "service-requests"]
 *   queryKeys.bluefolder.serviceRequests.detail(orgId, 12345)
 *     // ["bluefolder", "org_abc", "service-requests", "detail", 12345]
 *   queryKeys.bluefolder.serviceRequests.files(orgId, 12345)
 *     // ["bluefolder", "org_abc", "service-requests", "files", 12345]
 */

export const queryKeys = {
  bluefolder: {
    /** Matches ALL bluefolder queries for this org. */
    all: (orgId: string) => ['bluefolder', orgId] as const,

    /** Stats: sidebar badge + dashboard cards share this single cache entry. */
    stats: (orgId: string) => ['bluefolder', orgId, 'stats'] as const,

    /** Sync status: last-synced timestamp. */
    syncStatus: (orgId: string) => ['bluefolder', orgId, 'sync-status'] as const,

    serviceRequests: {
      /** Matches ALL service-request queries for this org. */
      all: (orgId: string) =>
        ['bluefolder', orgId, 'service-requests'] as const,

      /** The full list of service requests. */
      list: (orgId: string) =>
        ['bluefolder', orgId, 'service-requests', 'list'] as const,

      /** Single SR detail. */
      detail: (orgId: string, bluefolderId: number) =>
        ['bluefolder', orgId, 'service-requests', 'detail', bluefolderId] as const,

      /** Files for a single SR (lazy-loaded). */
      files: (orgId: string, bluefolderId: number) =>
        ['bluefolder', orgId, 'service-requests', 'files', bluefolderId] as const,
    },
  },

  vendorSourcing: {
    /** Matches ALL vendor-sourcing queries for this org. */
    all: (orgId: string) => ['vendor-sourcing', orgId] as const,

    /** Search sessions list. */
    sessions: (orgId: string) =>
      ['vendor-sourcing', orgId, 'sessions'] as const,

    /** Cached results for a specific SR. */
    results: (orgId: string, bluefolderId: number) =>
      ['vendor-sourcing', orgId, 'results', bluefolderId] as const,
  },

  organizationSettings: {
    /** Matches ALL org-settings queries for this org. */
    all: (orgId: string) => ['organization-settings', orgId] as const,

    /** BlueFolder API key (masked hint). */
    bluefolderApiKey: (orgId: string) =>
      ['organization-settings', orgId, 'bluefolder-api-key'] as const,
  },
} as const;

/**
 * Convenience type for extracting the return type of any key factory function.
 * Useful for typing custom `queryClient.invalidateQueries({ queryKey })` calls.
 */
export type QueryKeyOf<T extends (...args: never[]) => readonly unknown[]> =
  ReturnType<T>;
