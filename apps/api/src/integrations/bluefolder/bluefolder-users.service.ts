import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import type { Database } from '../../core/database';
import { bluefolderUsers } from '../../core/database/schema';
import { BlueFolderClientService } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { mapBlueFolderUser } from './mappers';
import type { BfUserListResponse } from './types/bluefolder-api.types';

export interface UserSyncResult {
  total: number;
  syncedAt: Date;
}

@Injectable()
export class BlueFolderUsersService {
  private readonly logger = new Logger(BlueFolderUsersService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    private readonly client: BlueFolderClientService,
    private readonly settingsService: OrganizationSettingsService,
  ) {}

  async sync(clerkOrgId: string): Promise<UserSyncResult> {
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);
    const apiKey = await this.settingsService.getDecryptedApiKey(clerkOrgId);

    if (!apiKey) {
      throw new BadRequestException(
        'BlueFolder API key not configured for this organization',
      );
    }

    const result = await this.client.request<BfUserListResponse>(
      'users/list.aspx',
      apiKey,
      { userList: { listType: 'basic' } },
    );

    const users = result.user ?? [];
    const syncedAt = new Date();

    if (users.length === 0) {
      this.logger.log('No BlueFolder users to sync', { clerkOrgId });
      return { total: 0, syncedAt };
    }

    const mapped = users.map(mapBlueFolderUser);

    const rows = mapped.map((u) => ({
      organizationId,
      bluefolderId: u.bluefolderId,
      displayName: u.displayName,
      firstName: u.firstName,
      lastName: u.lastName,
      userName: u.userName,
      userType: u.userType,
      inactive: u.inactive,
      syncedAt,
      updatedAt: syncedAt,
    }));

    await this.db
      .insert(bluefolderUsers)
      .values(rows)
      .onConflictDoUpdate({
        target: [bluefolderUsers.organizationId, bluefolderUsers.bluefolderId],
        set: {
          displayName: sql`excluded.display_name`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          userName: sql`excluded.user_name`,
          userType: sql`excluded.user_type`,
          inactive: sql`excluded.inactive`,
          syncedAt: sql`excluded.synced_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    this.logger.log('Synced BlueFolder users', {
      clerkOrgId,
      total: mapped.length,
    });

    return { total: mapped.length, syncedAt };
  }

  async buildUserMap(
    organizationId: string,
    userIds: number[],
  ): Promise<Map<number, string>> {
    const unique = [...new Set(userIds.filter((id) => id > 0))];
    if (unique.length === 0) return new Map();

    const rows = await this.db
      .select({
        bluefolderId: bluefolderUsers.bluefolderId,
        displayName: bluefolderUsers.displayName,
      })
      .from(bluefolderUsers)
      .where(
        and(
          eq(bluefolderUsers.organizationId, organizationId),
          inArray(bluefolderUsers.bluefolderId, unique),
        ),
      );

    return new Map(rows.map((r) => [r.bluefolderId, r.displayName]));
  }

  static resolveName(
    map: Map<number, string>,
    userId: number | null | undefined,
  ): string | null {
    if (userId === null || userId === undefined || userId === 0) return null;
    return map.get(userId) ?? `User #${userId}`;
  }
}
