import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrganizationSettingsService } from './settings.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import { randomBytes } from 'node:crypto';
import * as cryptoUtil from '../../common/utils/crypto.util';

const MOCK_ORG_UUID = '11111111-1111-1111-1111-111111111111';
const MOCK_CLERK_ORG_ID = 'org_clerk123';

function createMockDb() {
  const chainable = {
    from: mock(() => chainable),
    where: mock(() => chainable),
    limit: mock(() => Promise.resolve([])),
    set: mock(() => chainable),
    values: mock(() => Promise.resolve([])),
  };

  return {
    select: mock(() => chainable),
    insert: mock(() => chainable),
    update: mock(() => chainable),
    delete: mock(() => chainable),
    _chainable: chainable,
  };
}

describe('OrganizationSettingsService', () => {
  let service: OrganizationSettingsService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEncrypt: ReturnType<typeof spyOn>;
  let mockDecrypt: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
    mockDb = createMockDb();

    mockEncrypt = spyOn(cryptoUtil, 'encrypt');
    mockDecrypt = spyOn(cryptoUtil, 'decrypt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSettingsService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get(OrganizationSettingsService);
  });

  afterEach(() => {
    mockEncrypt.mockRestore();
    mockDecrypt.mockRestore();
    delete process.env.ENCRYPTION_KEY;
  });

  describe('resolveOrgId', () => {
    it('should return internal UUID for valid Clerk org ID', async () => {
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);

      const result = await service.resolveOrgId(MOCK_CLERK_ORG_ID);
      expect(result).toBe(MOCK_ORG_UUID);
    });

    it('should throw NotFoundException for unknown Clerk org ID', async () => {
      mockDb._chainable.limit.mockResolvedValueOnce([]);

      await expect(service.resolveOrgId('org_unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSettings', () => {
    it('should return settings for an org', async () => {
      const mockSettings = {
        id: 'settings-uuid',
        organizationId: MOCK_ORG_UUID,
        bluefolderApiKeyHint: 'ab12',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call: resolveOrgId
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      // Second call: getSettings
      mockDb._chainable.limit.mockResolvedValueOnce([mockSettings]);

      const result = await service.getSettings(MOCK_CLERK_ORG_ID);
      expect(result).toEqual(mockSettings);
      expect(result?.bluefolderApiKeyHint).toBe('ab12');
    });

    it('should return null when no settings exist', async () => {
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      mockDb._chainable.limit.mockResolvedValueOnce([]);

      const result = await service.getSettings(MOCK_CLERK_ORG_ID);
      expect(result).toBeNull();
    });
  });

  describe('saveApiKey', () => {
    it('should insert new settings when none exist', async () => {
      mockEncrypt.mockReturnValue('encrypted-value');
      // resolveOrgId
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      // check existing
      mockDb._chainable.limit.mockResolvedValueOnce([]);

      const result = await service.saveApiKey(
        MOCK_CLERK_ORG_ID,
        'my-api-key-1234',
      );

      expect(result.hint).toBe('1234');
      expect(mockEncrypt).toHaveBeenCalledWith('my-api-key-1234');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should update existing settings', async () => {
      mockEncrypt.mockReturnValue('encrypted-updated');
      // resolveOrgId
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      // check existing — found
      mockDb._chainable.limit.mockResolvedValueOnce([
        { id: 'existing-settings-id' },
      ]);

      const result = await service.saveApiKey(
        MOCK_CLERK_ORG_ID,
        'new-key-5678',
      );

      expect(result.hint).toBe('5678');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should store last 4 chars as hint', async () => {
      mockEncrypt.mockReturnValue('encrypted');
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      mockDb._chainable.limit.mockResolvedValueOnce([]);

      const result = await service.saveApiKey(MOCK_CLERK_ORG_ID, 'abcXYZ');
      expect(result.hint).toBe('cXYZ');
    });
  });

  describe('deleteApiKey', () => {
    it('should set API key and hint to null', async () => {
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);

      await service.deleteApiKey(MOCK_CLERK_ORG_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb._chainable.set).toHaveBeenCalledWith(
        expect.objectContaining({
          bluefolderApiKey: null,
          bluefolderApiKeyHint: null,
        }),
      );
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should return decrypted key when it exists', async () => {
      mockDecrypt.mockReturnValue('decrypted-api-key');
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      mockDb._chainable.limit.mockResolvedValueOnce([
        { bluefolderApiKey: 'encrypted-value' },
      ]);

      const result = await service.getDecryptedApiKey(MOCK_CLERK_ORG_ID);
      expect(result).toBe('decrypted-api-key');
      expect(mockDecrypt).toHaveBeenCalledWith('encrypted-value');
    });

    it('should return null when no API key is stored', async () => {
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      mockDb._chainable.limit.mockResolvedValueOnce([
        { bluefolderApiKey: null },
      ]);

      const result = await service.getDecryptedApiKey(MOCK_CLERK_ORG_ID);
      expect(result).toBeNull();
    });

    it('should return null when no settings row exists', async () => {
      mockDb._chainable.limit.mockResolvedValueOnce([{ id: MOCK_ORG_UUID }]);
      mockDb._chainable.limit.mockResolvedValueOnce([]);

      const result = await service.getDecryptedApiKey(MOCK_CLERK_ORG_ID);
      expect(result).toBeNull();
    });
  });
});
