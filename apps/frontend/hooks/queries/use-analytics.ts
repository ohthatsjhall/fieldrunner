'use client';

import { useAuth } from '@clerk/nextjs';
import type { AnalyticsDashboardResponse } from '@fieldrunner/shared';
import { queryKeys } from './query-keys';
import { useApiQuery } from './use-api-query';

const DASHBOARD_STALE_TIME = 2 * 60_000;
const DASHBOARD_GC_TIME = 10 * 60_000;

export function useAnalyticsDashboard(range: string = 'all') {
  const { orgId } = useAuth();

  const params = range && range !== 'all' ? `?range=${range}` : '';

  return useApiQuery<AnalyticsDashboardResponse>({
    queryKey: [...queryKeys.analytics.dashboard(orgId!), range],
    path: `/analytics/dashboard${params}`,
    enabled: !!orgId,
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
  });
}
