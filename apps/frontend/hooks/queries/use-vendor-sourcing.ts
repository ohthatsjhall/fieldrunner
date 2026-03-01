/**
 * Vendor Sourcing Domain Hooks
 *
 * Mutation for triggering a vendor search from the SR detail page, plus an
 * optional query hook for listing past search sessions.
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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches the list of vendor search sessions for the current org.
 * Useful for a "Search History" view in settings or analytics.
 *
 * @example
 *   const { data: sessions = [] } = useVendorSearchSessions();
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

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Triggers a vendor search. The mutation accepts a `VendorSearchRequest` body
 * and returns a `VendorSearchResponse` with ranked candidates.
 *
 * On success, invalidates the sessions list so any search-history views
 * reflect the new session.
 *
 * @example
 *   const vendorSearch = useVendorSearch();
 *
 *   vendorSearch.mutate(
 *     { serviceRequestBluefolderId: sr.serviceRequestId },
 *     {
 *       onError: (err) => toast.error(err.message),
 *     },
 *   );
 *
 *   // Access the result:
 *   vendorSearch.data?.candidates
 */
export function useVendorSearch() {
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
    },
  });
}
