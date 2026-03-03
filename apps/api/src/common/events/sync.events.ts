export const SYNC_COMPLETED = 'sync.completed';

export interface SyncCompletedEvent {
  clerkOrgId: string;
  organizationId: string;
}
