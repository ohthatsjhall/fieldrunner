/**
 * Vendor Sourcing Domain Hooks
 *
 * Query hook for reading cached vendor search results from DB,
 * mutation for triggering a (re-)search, and session list query.
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import type {
  VendorSearchRequest,
  VendorSearchResponse,
  VendorSearchSession,
} from '@fieldrunner/shared';

import { queryKeys } from './query-keys';
import { useApiQuery, useApiMutation, useQueryClient } from './use-api-query';

// ---------------------------------------------------------------------------
// Cache timing
// ---------------------------------------------------------------------------

const SESSIONS_STALE_TIME = 60_000;
const SESSIONS_GC_TIME = 5 * 60_000;
const RESULTS_POLL_INTERVAL = 5_000;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches the list of vendor search sessions for the current org.
 * Useful for a "Search History" view in settings or analytics.
 */
export function useVendorSearchSessions() {
  const { orgId } = useAuth();

  return useApiQuery<VendorSearchSession[]>({
    queryKey: queryKeys.vendorSourcing.sessions(orgId!),
    path: '/vendor-sourcing/sessions',
    enabled: !!orgId,
    staleTime: SESSIONS_STALE_TIME,
    gcTime: SESSIONS_GC_TIME,
  });
}

/**
 * Reads vendor search results from DB for a specific service request.
 * Polls every 5s while status is 'in_progress' (auto-search running).
 */
export function useVendorSearchResults(bluefolderId: number) {
  const { orgId } = useAuth();

  return useApiQuery<VendorSearchResponse | null>({
    queryKey: queryKeys.vendorSourcing.results(orgId!, bluefolderId),
    path: `/vendor-sourcing/results?serviceRequestBluefolderId=${bluefolderId}`,
    enabled: !!orgId && bluefolderId > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status === 'in_progress') return RESULTS_POLL_INTERVAL;
      return false;
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Triggers a vendor search (or re-search). On success, invalidates the
 * results query so the page refetches from DB.
 */
export function useVendorSearch(bluefolderId?: number) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<VendorSearchResponse, VendorSearchRequest>({
    path: '/vendor-sourcing/search',
    method: 'POST',
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorSourcing.sessions(orgId),
      });
      if (bluefolderId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.vendorSourcing.results(orgId, bluefolderId),
        });
      }
    },
  });
}
