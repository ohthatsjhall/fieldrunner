/**
 * Public API for all React Query hooks.
 *
 * Import from `@/hooks/queries` in components — never import individual files.
 *
 * @example
 *   import { useStats, useSyncBlueFolder, queryKeys } from '@/hooks/queries';
 */

// Provider (used once in root layout)
export { QueryProvider } from './query-provider';

// Key factory
export { queryKeys } from './query-keys';
export type { QueryKeyOf } from './query-keys';

// Foundation (rarely imported directly, but available)
export { useApiQuery, useApiMutation, useQueryClient } from './use-api-query';

// BlueFolder domain
export {
  useStats,
  useServiceRequests,
  useServiceRequestDetail,
  useServiceRequestFiles,
  useSyncStatus,
  useSyncBlueFolder,
} from './use-bluefolder';

// Vendor sourcing domain
export {
  useVendorSearchSessions,
  useVendorSearchResults,
  useVendorSearch,
} from './use-vendor-sourcing';

// Organization settings domain
export {
  useBluefolderApiKey,
  useSaveBluefolderApiKey,
  useDeleteBluefolderApiKey,
} from './use-organization-settings';
export type {
  BluefolderApiKeyResponse,
  SaveBluefolderApiKeyRequest,
} from './use-organization-settings';
