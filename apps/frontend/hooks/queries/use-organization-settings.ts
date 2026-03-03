/**
 * Organization Settings Domain Hooks
 *
 * CRUD operations for org-level configuration (BlueFolder API key, etc.).
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import type { OrganizationSettings } from '@fieldrunner/shared';

import { queryKeys } from './query-keys';
import { useApiQuery, useApiMutation, useQueryClient } from './use-api-query';

// ---------------------------------------------------------------------------
// Types (API-specific, not in @fieldrunner/shared)
// ---------------------------------------------------------------------------

/** Response shape from GET /organization-settings/bluefolder-api-key. */
export type BluefolderApiKeyResponse = {
  /** Masked hint, e.g. "sk-****abcd". Null if no key is configured. */
  hint: string | null;
  /** Whether a key is currently configured. */
  configured: boolean;
};

/** Request body for PUT /organization-settings/bluefolder-api-key. */
export type SaveBluefolderApiKeyRequest = {
  apiKey: string;
};

// ---------------------------------------------------------------------------
// Cache timing
// ---------------------------------------------------------------------------

/** Settings rarely change — long staleness is fine. */
const SETTINGS_STALE_TIME = 5 * 60_000;
const SETTINGS_GC_TIME = 30 * 60_000;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches the BlueFolder API key configuration (masked hint + configured flag).
 *
 * @example
 *   const { data } = useBluefolderApiKey();
 *   // data?.configured, data?.hint
 */
export function useBluefolderApiKey() {
  const { orgId } = useAuth();

  return useApiQuery<BluefolderApiKeyResponse>({
    queryKey: queryKeys.organizationSettings.bluefolderApiKey(orgId!),
    path: '/organization-settings/bluefolder-api-key',
    enabled: !!orgId,
    staleTime: SETTINGS_STALE_TIME,
    gcTime: SETTINGS_GC_TIME,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Saves (creates or updates) the BlueFolder API key.
 *
 * On success, invalidates the organization-settings subtree (covers the
 * key query and any future settings queries).
 *
 * @example
 *   const saveKey = useSaveBluefolderApiKey();
 *   saveKey.mutate({ apiKey: 'sk-...' });
 */
export function useSaveBluefolderApiKey() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<OrganizationSettings, SaveBluefolderApiKeyRequest>({
    path: '/organization-settings/bluefolder-api-key',
    method: 'PUT',
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings.all(orgId),
      });
    },
  });
}

/**
 * Deletes the BlueFolder API key.
 *
 * On success, invalidates the key query and the full bluefolder subtree
 * (since without a key, all bluefolder queries should show unconfigured state).
 *
 * @example
 *   const deleteKey = useDeleteBluefolderApiKey();
 *   deleteKey.mutate();
 */
export function useDeleteBluefolderApiKey() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<void, void>({
    path: '/organization-settings/bluefolder-api-key',
    method: 'DELETE',
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings.all(orgId),
      });
      // Bluefolder data is no longer accessible without a key
      queryClient.invalidateQueries({
        queryKey: queryKeys.bluefolder.all(orgId),
      });
    },
  });
}
