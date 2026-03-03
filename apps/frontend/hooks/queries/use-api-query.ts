/**
 * Foundational wrapper that bridges `useApiClient().apiFetch` with React Query.
 *
 * Every query hook in the app delegates to `useApiQuery` or `useApiMutation`
 * so that Bearer-token injection, error typing, and org-readiness gating are
 * handled in exactly one place.
 */

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useApiClient, ApiError } from '@/lib/api-client-browser';

// ---------------------------------------------------------------------------
// useApiQuery — typed GET wrapper
// ---------------------------------------------------------------------------

type UseApiQueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  /** The query key array (from queryKeys factory). */
  queryKey: QueryKey;
  /** API path, e.g. "/bluefolder/stats". */
  path: string;
};

/**
 * Generic hook that wires `apiFetch` as the `queryFn` for React Query.
 *
 * - Automatically disables the query when `orgId` is not yet loaded (Clerk
 *   hydration) by ANDing with the caller's `enabled` option.
 * - Typed error channel is always `ApiError`.
 *
 * @example
 *   const { data } = useApiQuery<ServiceRequestStats>({
 *     queryKey: queryKeys.bluefolder.stats(orgId!),
 *     path: '/bluefolder/stats',
 *     enabled: !!orgId,
 *     staleTime: 30_000,
 *   });
 */
export function useApiQuery<TData>(options: UseApiQueryOptions<TData>) {
  const { orgId } = useAuth();
  const { apiFetch } = useApiClient();

  const { queryKey, path, enabled, ...rest } = options;

  return useQuery<TData, ApiError, TData, QueryKey>({
    queryKey,
    queryFn: () => apiFetch<TData>(path),
    // Only fire when Clerk's org context is ready AND caller says enabled
    enabled: !!orgId && (enabled ?? true),
    ...rest,
  });
}

// ---------------------------------------------------------------------------
// useApiMutation — typed POST/PUT/DELETE wrapper
// ---------------------------------------------------------------------------

type UseApiMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  'mutationFn'
> & {
  /** API path, e.g. "/bluefolder/sync". Can be a function for dynamic paths. */
  path: string | ((variables: TVariables) => string);
  /** HTTP method. Defaults to "POST". */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
};

/**
 * Generic hook that wires `apiFetch` as the `mutationFn` for React Query.
 *
 * The `TVariables` type is sent as the JSON body (for POST/PUT/PATCH).
 * For DELETE, variables are not included in the request body but are still
 * available for dynamic path resolution. Use `onSuccess` to invalidate related queries.
 *
 * @example
 *   const sync = useApiMutation<void, void>({
 *     path: '/bluefolder/sync',
 *     method: 'POST',
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: queryKeys.bluefolder.all(orgId!) });
 *     },
 *   });
 */
export function useApiMutation<TData, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>,
) {
  const { apiFetch } = useApiClient();
  const { path, method = 'POST', ...rest } = options;

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: (variables: TVariables) => {
      const resolvedPath = typeof path === 'function' ? path(variables) : path;

      const init: RequestInit = { method };

      // Only attach a body for methods that support it, and only if there
      // are actually variables to send.
      if (
        method !== 'DELETE' &&
        variables !== undefined &&
        variables !== null
      ) {
        init.body = JSON.stringify(variables);
      }

      return apiFetch<TData>(resolvedPath, init);
    },
    ...rest,
  });
}

// ---------------------------------------------------------------------------
// Re-export useQueryClient for convenience in mutation hooks
// ---------------------------------------------------------------------------

export { useQueryClient };
