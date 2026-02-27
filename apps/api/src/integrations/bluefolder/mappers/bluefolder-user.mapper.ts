import type { BfUser } from '../types/bluefolder-api.types';

export interface MappedBlueFolderUser {
  bluefolderId: number;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  userName: string | null;
  userType: string | null;
  inactive: boolean;
}

function toNumber(value: string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

function toBool(value: string | undefined | null): boolean {
  return value === 'true' || value === 'True';
}

function toStringOrNull(value: string | undefined | null): string | null {
  if (!value || value === '') return null;
  return value;
}

export function mapBlueFolderUser(user: BfUser): MappedBlueFolderUser {
  return {
    bluefolderId: toNumber(user.userId),
    displayName: user.displayName ?? '',
    firstName: toStringOrNull(user.firstName),
    lastName: toStringOrNull(user.lastName),
    userName: toStringOrNull(user.userName),
    userType: toStringOrNull(user.userType),
    inactive: toBool(user.inactive),
  };
}
