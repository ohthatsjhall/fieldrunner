/**
 * BlueFolder Domain Hooks
 *
 * All GET queries and POST/PUT mutations related to the BlueFolder integration.
 * Each hook encapsulates its query key, path, cache timing, and invalidation
 * strategy so that consumers never need to think about these details.
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import type {
  ServiceRequest,
  ServiceRequestStats,
  ServiceRequestDetail,
  ServiceRequestFile,
} from '@fieldrunner/shared';

import { queryKeys } from './query-keys';
import { useApiQuery, useApiMutation, useQueryClient } from './use-api-query';

// ---------------------------------------------------------------------------
// Cache timing constants (milliseconds)
// ---------------------------------------------------------------------------

/** Stats are polled from multiple components — keep fresh but tolerate 30s staleness. */
const STATS_STALE_TIME = 30_000;
const STATS_GC_TIME = 5 * 60_000;

/** The list changes only on sync — 60s staleness is fine. */
const LIST_STALE_TIME = 60_000;
const LIST_GC_TIME = 5 * 60_000;

/** Detail is read-heavy; allow 2 min staleness (user can pull-to-refresh). */
const DETAIL_STALE_TIME = 2 * 60_000;
const DETAIL_GC_TIME = 10 * 60_000;

/** Files rarely change — 5 min staleness. */
const FILES_STALE_TIME = 5 * 60_000;
const FILES_GC_TIME = 10 * 60_000;

/** Sync status — lightweight, same cadence as stats. */
const SYNC_STATUS_STALE_TIME = 30_000;
const SYNC_STATUS_GC_TIME = 5 * 60_000;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches aggregate stats: `{ newCount, inProgress, assigned, open }`.
 *
 * **Shared cache entry** — the sidebar badge and the dashboard stats cards
 * both call this hook and read from the same cache. The first to mount fires
 * the request; the second gets an instant cache hit.
 *
 * @example
 *   const { data: stats, isLoading } = useStats();
 *   // stats?.newCount
 */
export function useStats() {
  const { orgId } = useAuth();

  return useApiQuery<ServiceRequestStats>({
    queryKey: queryKeys.bluefolder.stats(orgId!),
    path: '/bluefolder/stats',
    enabled: !!orgId,
    staleTime: STATS_STALE_TIME,
    gcTime: STATS_GC_TIME,
  });
}

/**
 * Fetches the full list of service requests for the current org.
 *
 * @example
 *   const { data: serviceRequests = [] } = useServiceRequests();
 */
export function useServiceRequests() {
  const { orgId } = useAuth();

  return useApiQuery<ServiceRequest[]>({
    queryKey: queryKeys.bluefolder.serviceRequests.list(orgId!),
    path: '/bluefolder/service-requests',
    enabled: !!orgId,
    staleTime: LIST_STALE_TIME,
    gcTime: LIST_GC_TIME,
  });
}

/**
 * Fetches the full detail of a single service request by BlueFolder ID.
 *
 * @param bluefolderId  The BlueFolder-native numeric ID (from the URL param).
 *
 * @example
 *   const { data: sr, isLoading, error } = useServiceRequestDetail(12345);
 */
export function useServiceRequestDetail(bluefolderId: number) {
  const { orgId } = useAuth();

  return useApiQuery<ServiceRequestDetail>({
    queryKey: queryKeys.bluefolder.serviceRequests.detail(orgId!, bluefolderId),
    path: `/bluefolder/service-requests/${bluefolderId}`,
    enabled: !!orgId && bluefolderId > 0,
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });
}

/**
 * Fetches files attached to a service request. **Lazy-loaded** — the query is
 * disabled by default. Pass `enabled: true` when the user clicks the "Files"
 * tab, and the fetch fires exactly once (subsequent renders are cache hits).
 *
 * @param bluefolderId  The BlueFolder-native numeric ID.
 * @param enabled       Pass `true` to trigger the fetch (e.g., on tab click).
 *
 * @example
 *   const [filesEnabled, setFilesEnabled] = useState(false);
 *   const { data: files = [] } = useServiceRequestFiles(12345, filesEnabled);
 *   // On tab click: setFilesEnabled(true);
 */
export function useServiceRequestFiles(
  bluefolderId: number,
  enabled: boolean,
) {
  const { orgId } = useAuth();

  return useApiQuery<ServiceRequestFile[]>({
    queryKey: queryKeys.bluefolder.serviceRequests.files(orgId!, bluefolderId),
    path: `/bluefolder/service-requests/${bluefolderId}/files`,
    enabled: !!orgId && bluefolderId > 0 && enabled,
    staleTime: FILES_STALE_TIME,
    gcTime: FILES_GC_TIME,
  });
}

/**
 * Fetches the last sync timestamp.
 *
 * @example
 *   const { data } = useSyncStatus();
 *   // data?.lastSyncedAt
 */
export function useSyncStatus() {
  const { orgId } = useAuth();

  return useApiQuery<{ lastSyncedAt: string | null }>({
    queryKey: queryKeys.bluefolder.syncStatus(orgId!),
    path: '/bluefolder/sync-status',
    enabled: !!orgId,
    staleTime: SYNC_STATUS_STALE_TIME,
    gcTime: SYNC_STATUS_GC_TIME,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Triggers a full BlueFolder sync.
 *
 * On success, invalidates:
 *   - `bluefolder.stats`           (counts change)
 *   - `bluefolder.serviceRequests` (list + all details/files)
 *   - `bluefolder.syncStatus`      (timestamp changes)
 *
 * The broad invalidation via `serviceRequests.all` covers the list AND every
 * cached detail/file query, so the user sees fresh data everywhere after sync.
 *
 * @example
 *   const sync = useSyncBlueFolder();
 *   <button onClick={() => sync.mutate()} disabled={sync.isPending}>
 *     {sync.isPending ? 'Syncing...' : 'Sync'}
 *   </button>
 */
export function useSyncBlueFolder() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<void, void>({
    path: '/bluefolder/sync',
    method: 'POST',
    onSuccess: () => {
      if (!orgId) return;

      // Invalidate stats, the full SR subtree, and sync status.
      // Using Promise.all is not required — invalidateQueries is synchronous
      // in terms of marking queries stale; refetches happen in the background.
      queryClient.invalidateQueries({
        queryKey: queryKeys.bluefolder.stats(orgId),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bluefolder.serviceRequests.all(orgId),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bluefolder.syncStatus(orgId),
        refetchType: 'all',
      });
    },
  });
}
