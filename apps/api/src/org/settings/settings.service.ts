import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import type { Database } from '../../core/database';
import { organizations, organizationSettings } from '../../core/database/schema';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

@Injectable()
export class OrganizationSettingsService {
  private readonly logger = new Logger(OrganizationSettingsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async resolveOrgId(clerkOrgId: string): Promise<string> {
    const org = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkId, clerkOrgId))
      .limit(1);

    if (org.length === 0) {
      throw new NotFoundException(
        `Organization not found for Clerk ID: ${clerkOrgId}`,
      );
    }

    return org[0].id;
  }

  async getSettings(clerkOrgId: string) {
    const orgId = await this.resolveOrgId(clerkOrgId);

    const settings = await this.db
      .select({
        id: organizationSettings.id,
        organizationId: organizationSettings.organizationId,
        bluefolderApiKeyHint: organizationSettings.bluefolderApiKeyHint,
        createdAt: organizationSettings.createdAt,
        updatedAt: organizationSettings.updatedAt,
      })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, orgId))
      .limit(1);

    return settings[0] ?? null;
  }

  async saveApiKey(clerkOrgId: string, apiKey: string) {
    const orgId = await this.resolveOrgId(clerkOrgId);
    const encryptedKey = encrypt(apiKey);
    const hint = apiKey.slice(-4);
    const now = new Date();

    const existing = await this.db
      .select({ id: organizationSettings.id })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, orgId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(organizationSettings)
        .set({
          bluefolderApiKey: encryptedKey,
          bluefolderApiKeyHint: hint,
          updatedAt: now,
        })
        .where(eq(organizationSettings.organizationId, orgId));
    } else {
      await this.db.insert(organizationSettings).values({
        organizationId: orgId,
        bluefolderApiKey: encryptedKey,
        bluefolderApiKeyHint: hint,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.logger.log('BlueFolder API key saved', {
      organizationId: orgId,
      hint,
    });

    return { hint };
  }

  async deleteApiKey(clerkOrgId: string) {
    const orgId = await this.resolveOrgId(clerkOrgId);

    await this.db
      .update(organizationSettings)
      .set({
        bluefolderApiKey: null,
        bluefolderApiKeyHint: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.organizationId, orgId));

    this.logger.log('BlueFolder API key deleted', { organizationId: orgId });
  }

  async getDecryptedApiKey(clerkOrgId: string): Promise<string | null> {
    const orgId = await this.resolveOrgId(clerkOrgId);

    const settings = await this.db
      .select({ bluefolderApiKey: organizationSettings.bluefolderApiKey })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, orgId))
      .limit(1);

    if (!settings[0]?.bluefolderApiKey) {
      return null;
    }

    return decrypt(settings[0].bluefolderApiKey);
  }
}
