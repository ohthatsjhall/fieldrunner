import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, sql, notExists } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import {
  vendors,
  serviceRequests,
  vendorAssignments,
} from '../../core/database/schema';
import { BlueFolderService } from '../bluefolder/bluefolder.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { normalizePhone } from './mappers';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../core/database/schema';

type ParsedVendorInfo = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

type MatchResult = {
  vendorId: string | null;
  confidence: 'phone_exact' | 'name_fuzzy' | 'unmatched';
};

const REQUEST_DELAY_MS = 2000;

@Injectable()
export class VendorBackfillService {
  private readonly logger = new Logger(VendorBackfillService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly blueFolderService: BlueFolderService,
    private readonly settingsService: OrganizationSettingsService,
  ) {}

  /**
   * Parse a BlueFolder "Vendor Information" custom field value.
   * Lines are order-independent: email (contains @), phone (digits pattern), name (first unclassified).
   */
  parseVendorInformationField(rawValue: string): ParsedVendorInfo {
    if (!rawValue || !rawValue.trim()) {
      return { name: null, phone: null, email: null };
    }

    const lines = rawValue
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let name: string | null = null;
    let phone: string | null = null;
    let email: string | null = null;

    for (const line of lines) {
      if (!email && line.includes('@')) {
        email = line;
      } else if (!phone && this.looksLikePhone(line)) {
        phone = line;
      } else if (!name) {
        name = line;
      }
    }

    return { name, phone, email };
  }

  /**
   * Match a parsed vendor to an existing vendor record in the database.
   */
  async matchVendor(
    organizationId: string,
    parsed: ParsedVendorInfo,
  ): Promise<MatchResult> {
    // 1. Phone match (highest confidence)
    if (parsed.phone) {
      const normalized = normalizePhone(parsed.phone);
      if (normalized) {
        const phoneMatches = await this.db
          .select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(
            and(
              eq(vendors.organizationId, organizationId),
              eq(vendors.phone, normalized),
            ),
          );

        if (phoneMatches.length === 1) {
          return { vendorId: phoneMatches[0].id, confidence: 'phone_exact' };
        }
      }

      // Phone provided but no match — fall through to unmatched (don't try name)
      return { vendorId: null, confidence: 'unmatched' };
    }

    // 2. Name match (lower confidence, only if exactly 1 result)
    if (parsed.name) {
      const nameMatches = await this.db
        .select({ id: vendors.id, name: vendors.name })
        .from(vendors)
        .where(
          and(
            eq(vendors.organizationId, organizationId),
            sql`LOWER(${vendors.name}) = LOWER(${parsed.name})`,
          ),
        );

      if (nameMatches.length === 1) {
        return { vendorId: nameMatches[0].id, confidence: 'name_fuzzy' };
      }
    }

    return { vendorId: null, confidence: 'unmatched' };
  }

  /**
   * Run the backfill for an organization.
   * Fetches closed SRs without vendor assignments, looks up BF custom fields,
   * parses vendor info, matches, and creates assignment rows.
   */
  async backfill(clerkOrgId: string) {
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    // Find closed SRs without a vendor_assignment row
    const closedSrs = await this.db
      .select({
        id: serviceRequests.id,
        bluefolderId: serviceRequests.bluefolderId,
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.organizationId, organizationId),
          eq(serviceRequests.isOpen, false),
          notExists(
            this.db
              .select({ id: vendorAssignments.id })
              .from(vendorAssignments)
              .where(
                eq(
                  vendorAssignments.serviceRequestId,
                  serviceRequests.id,
                ),
              ),
          ),
        ),
      );

    let processed = 0;
    let matched = 0;
    let unmatched = 0;
    let skipped = 0;

    this.logger.log(`Found ${closedSrs.length} closed SRs without vendor assignments`);

    for (let i = 0; i < closedSrs.length; i++) {
      const sr = closedSrs[i];

      this.logger.log(`[${i + 1}/${closedSrs.length}] Processing SR #${sr.bluefolderId}`);

      try {
        const detail = await this.blueFolderService.getServiceRequest(
          clerkOrgId,
          sr.bluefolderId,
        );

        // Find "Vendor Information" custom field
        const vendorField = detail.customFields?.find(
          (f) => f.name === 'Vendor Information',
        );

        if (!vendorField?.value || typeof vendorField.value !== 'string') {
          skipped++;
          continue;
        }

        const parsed = this.parseVendorInformationField(vendorField.value);
        if (!parsed.name && !parsed.phone && !parsed.email) {
          skipped++;
          continue;
        }

        const match = await this.matchVendor(organizationId, parsed);

        await this.db
          .insert(vendorAssignments)
          .values({
            organizationId,
            serviceRequestId: sr.id,
            vendorId: match.vendorId,
            source: 'bluefolder_backfill',
            vendorName: parsed.name ?? 'Unknown',
            vendorPhone: normalizePhone(parsed.phone),
            vendorPhoneRaw: parsed.phone,
            vendorEmail: parsed.email,
            bfRawFieldValue: vendorField.value,
            matchConfidence: match.confidence,
          })
          .onConflictDoNothing();

        processed++;
        if (match.vendorId) {
          matched++;
        } else {
          unmatched++;
        }
      } catch (err) {
        this.logger.warn(
          `Backfill failed for SR #${sr.bluefolderId}: ${err instanceof Error ? err.message : String(err)}`,
        );
        skipped++;
      }

      // Rate limit: delay between each BF API request
      if (i + 1 < closedSrs.length) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
      }
    }

    this.logger.log(
      `Backfill complete: ${processed} processed, ${matched} matched, ${unmatched} unmatched, ${skipped} skipped`,
    );

    return { processed, matched, unmatched, skipped };
  }

  private looksLikePhone(line: string): boolean {
    // Must have at least 7 digits
    const digits = line.replace(/\D/g, '');
    if (digits.length < 7) return false;
    // Should be mostly digits and phone formatting chars
    const phoneChars = line.replace(/[\d\s\-().+]/g, '');
    return phoneChars.length <= 2;
  }
}
