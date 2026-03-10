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
  VendorAssignment,
  VendorContactAttempt,
  ContactStatus,
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

/**
 * Reads the current vendor assignment for a service request.
 */
export function useVendorAssignment(bluefolderId: number) {
  const { orgId } = useAuth();

  return useApiQuery<VendorAssignment | null>({
    queryKey: queryKeys.vendorSourcing.assignment(orgId!, bluefolderId),
    path: `/vendor-sourcing/assignment?serviceRequestBluefolderId=${bluefolderId}`,
    enabled: !!orgId && bluefolderId > 0,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

type AcceptVendorRequest = {
  vendorId: string;
  serviceRequestBluefolderId: number;
  searchSessionId?: string;
  rank?: number;
  score?: number;
};

/**
 * Accepts a vendor for a service request. On success, invalidates the
 * assignment and results queries.
 */
export function useAcceptVendor(bluefolderId: number) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<VendorAssignment, AcceptVendorRequest>({
    path: '/vendor-sourcing/accept',
    method: 'POST',
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorSourcing.assignment(orgId, bluefolderId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorSourcing.results(orgId, bluefolderId),
      });
    },
  });
}

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

// ---------------------------------------------------------------------------
// Contact Attempt Mutations
// ---------------------------------------------------------------------------

type LogContactAttemptRequest = {
  vendorSearchResultId: string;
  status: ContactStatus;
  notes?: string;
};

/**
 * Logs a contact attempt for a vendor search result. On success, invalidates
 * the results query so badges update.
 */
export function useLogContactAttempt(bluefolderId: number) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<VendorContactAttempt, LogContactAttemptRequest>({
    path: '/vendor-sourcing/contact-attempt',
    method: 'POST',
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorSourcing.results(orgId, bluefolderId),
      });
    },
  });
}

type ClearContactAttemptsRequest = {
  vendorSearchResultId: string;
};

/**
 * Clears all contact attempts for a vendor search result. On success,
 * invalidates the results query so the row returns to normal.
 */
export function useClearContactAttempts(bluefolderId: number) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<{ cleared: boolean }, ClearContactAttemptsRequest>({
    path: (vars) => `/vendor-sourcing/contact-attempt/${vars.vendorSearchResultId}`,
    method: 'DELETE',
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendorSourcing.results(orgId, bluefolderId),
      });
    },
  });
}
