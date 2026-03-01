/**
 * React Query Provider
 *
 * Wraps the app tree with a QueryClientProvider. The QueryClient is created
 * once per browser tab (via useState) to avoid re-creating it on every render.
 *
 * Place this inside the ClerkProvider in the root layout so that all hooks
 * can access both the Clerk auth context and the React Query cache.
 */

'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ApiError } from '@/lib/api-client-browser';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Default stale time. Individual hooks override this with
         * domain-specific values, but this provides a sensible baseline
         * so that rapid component mounts/unmounts (tab switches, route
         * transitions) never fire redundant requests.
         */
        staleTime: 30_000,

        /**
         * Keep unused cache entries for 5 minutes before garbage collection.
         */
        gcTime: 5 * 60_000,

        /**
         * Do not retry on 4xx errors (auth, validation, not-found).
         * Only retry on network/server errors (5xx, status 0).
         */
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Never retry auth errors — Clerk should handle re-auth
            if (error.statusCode === 401) return false;
            // Never retry client errors (400, 403, 404, 422)
            if (error.statusCode >= 400 && error.statusCode < 500) return false;
          }
          // Retry server errors up to 2 times
          return failureCount < 2;
        },

        /**
         * Refetch on window focus to keep data fresh when the user
         * returns to the tab. Combined with staleTime, this only fires
         * if the data is actually stale.
         */
        refetchOnWindowFocus: true,
      },

      mutations: {
        /** Never auto-retry mutations — side effects must be explicit. */
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures the QueryClient is created exactly once per component
  // lifecycle (no SSR/hydration mismatch, no re-creation on re-render).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
