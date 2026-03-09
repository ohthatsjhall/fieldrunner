/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VendorBackfillService } from './vendor-backfill.service';
import { BlueFolderService } from '../bluefolder/bluefolder.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';

describe('VendorBackfillService', () => {
  let service: VendorBackfillService;
  let mockBlueFolderService: jest.Mocked<BlueFolderService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockDb: any;

  const internalOrgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockBlueFolderService = {
      getServiceRequest: jest.fn(),
    } as unknown as jest.Mocked<BlueFolderService>;

    mockSettings = {
      resolveOrgId: jest.fn().mockResolvedValue(internalOrgId),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'assignment-uuid' }]),
      onConflictDoUpdate: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorBackfillService,
        { provide: BlueFolderService, useValue: mockBlueFolderService },
        { provide: OrganizationSettingsService, useValue: mockSettings },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get(VendorBackfillService);
  });

  describe('parseVendorInformationField', () => {
    it('should parse name, phone, and email', () => {
      const raw = 'Acme Plumbing\r\n(512) 555-1234\r\nacme@example.com';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBe('(512) 555-1234');
      expect(result.email).toBe('acme@example.com');
    });

    it('should handle phone-first order', () => {
      const raw = '(512) 555-1234\r\nAcme Plumbing\r\nacme@example.com';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBe('(512) 555-1234');
      expect(result.email).toBe('acme@example.com');
    });

    it('should handle missing email', () => {
      const raw = 'Acme Plumbing\r\n(512) 555-1234';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBe('(512) 555-1234');
      expect(result.email).toBeNull();
    });

    it('should handle missing phone', () => {
      const raw = 'Acme Plumbing\r\nacme@example.com';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBeNull();
      expect(result.email).toBe('acme@example.com');
    });

    it('should handle name only', () => {
      const raw = 'Acme Plumbing';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should handle empty string', () => {
      const result = service.parseVendorInformationField('');
      expect(result.name).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should handle whitespace-only lines', () => {
      const raw = '  \r\n  Acme Plumbing  \r\n  ';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should handle LF line endings', () => {
      const raw = 'Acme Plumbing\n(512) 555-1234\nacme@example.com';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBe('(512) 555-1234');
      expect(result.email).toBe('acme@example.com');
    });

    it('should handle phone with +1 prefix', () => {
      const raw = 'Acme Plumbing\r\n+1 512-555-1234';
      const result = service.parseVendorInformationField(raw);

      expect(result.name).toBe('Acme Plumbing');
      expect(result.phone).toBe('+1 512-555-1234');
    });

    it('should handle 10-digit phone without formatting', () => {
      const raw = 'Acme Plumbing\r\n5125551234';
      const result = service.parseVendorInformationField(raw);

      expect(result.phone).toBe('5125551234');
    });
  });

  describe('matchVendor', () => {
    it('should match by phone (phone_exact)', async () => {
      // Phone match returns a vendor
      mockDb.where.mockResolvedValueOnce([
        { id: 'vendor-uuid', name: 'Acme Plumbing' },
      ]);

      const result = await service.matchVendor(internalOrgId, {
        name: 'Acme Plumbing',
        phone: '(512) 555-1234',
        email: null,
      });

      expect(result.vendorId).toBe('vendor-uuid');
      expect(result.confidence).toBe('phone_exact');
    });

    it('should fall back to name match (name_fuzzy)', async () => {
      // Phone match returns nothing (no phone to match)
      // Name match returns exactly 1 vendor
      mockDb.where.mockResolvedValueOnce([
        { id: 'vendor-uuid', name: 'Acme Plumbing' },
      ]);

      const result = await service.matchVendor(internalOrgId, {
        name: 'Acme Plumbing',
        phone: null,
        email: null,
      });

      expect(result.vendorId).toBe('vendor-uuid');
      expect(result.confidence).toBe('name_fuzzy');
    });

    it('should return unmatched when no phone and multiple name matches', async () => {
      // Name match returns 2 vendors (ambiguous)
      mockDb.where.mockResolvedValueOnce([
        { id: 'vendor-1', name: 'Acme Plumbing' },
        { id: 'vendor-2', name: 'Acme Plumbing LLC' },
      ]);

      const result = await service.matchVendor(internalOrgId, {
        name: 'Acme Plumbing',
        phone: null,
        email: null,
      });

      expect(result.vendorId).toBeNull();
      expect(result.confidence).toBe('unmatched');
    });

    it('should return unmatched when phone does not match any vendor', async () => {
      // Phone match returns nothing
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.matchVendor(internalOrgId, {
        name: 'Unknown Vendor',
        phone: '(999) 999-9999',
        email: null,
      });

      expect(result.vendorId).toBeNull();
      expect(result.confidence).toBe('unmatched');
    });

    it('should return unmatched when name is null and no phone', async () => {
      const result = await service.matchVendor(internalOrgId, {
        name: null,
        phone: null,
        email: null,
      });

      expect(result.vendorId).toBeNull();
      expect(result.confidence).toBe('unmatched');
    });
  });
});
