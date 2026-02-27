/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BlueFolderUsersService } from './bluefolder-users.service';
import { BlueFolderClientService } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';

describe('BlueFolderUsersService', () => {
  let service: BlueFolderUsersService;
  let mockClient: jest.Mocked<BlueFolderClientService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockDb: any;

  const clerkOrgId = 'org_test123';
  const internalOrgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockClient = {
      request: jest.fn(),
      buildAuthHeader: jest.fn(),
      buildRequestXml: jest.fn(),
      parseResponseXml: jest.fn(),
    } as jest.Mocked<BlueFolderClientService>;

    mockSettings = {
      resolveOrgId: jest.fn().mockResolvedValue(internalOrgId),
      getDecryptedApiKey: jest.fn(),
      getSettings: jest.fn(),
      saveApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlueFolderUsersService,
        { provide: BlueFolderClientService, useValue: mockClient },
        { provide: OrganizationSettingsService, useValue: mockSettings },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get(BlueFolderUsersService);
  });

  describe('sync', () => {
    it('should fetch from BlueFolder, map, and upsert to DB', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        user: [
          {
            userId: '1',
            firstName: 'Jane',
            lastName: 'Doe',
            displayName: 'Jane Doe',
            inactive: 'false',
            userName: 'jdoe',
            userType: 'Admin',
          },
          {
            userId: '2',
            firstName: 'Bob',
            lastName: 'Smith',
            displayName: 'Bob Smith',
            inactive: 'true',
            userName: 'bsmith',
            userType: 'Tech',
          },
        ],
      });

      const result = await service.sync(clerkOrgId);

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith(clerkOrgId);
      expect(mockSettings.getDecryptedApiKey).toHaveBeenCalledWith(clerkOrgId);
      expect(mockClient.request).toHaveBeenCalledWith(
        'users/list.aspx',
        'api-key',
        { userList: { listType: 'basic' } },
      );
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.total).toBe(2);
      expect(result.syncedAt).toBeInstanceOf(Date);
    });

    it('should return total 0 for empty list', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        user: [],
      });

      const result = await service.sync(clerkOrgId);

      expect(result.total).toBe(0);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle missing userList gracefully', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({});

      const result = await service.sync(clerkOrgId);

      expect(result.total).toBe(0);
    });

    it('should throw when no API key configured', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue(null);

      await expect(service.sync(clerkOrgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('buildUserMap', () => {
    it('should return Map<number, string> from DB query', async () => {
      mockDb.where.mockResolvedValue([
        { bluefolderId: 1, displayName: 'Jane Doe' },
        { bluefolderId: 2, displayName: 'Bob Smith' },
      ]);

      const map = await service.buildUserMap(internalOrgId, [1, 2]);

      expect(map.get(1)).toBe('Jane Doe');
      expect(map.get(2)).toBe('Bob Smith');
      expect(map.size).toBe(2);
    });

    it('should return empty map for empty input', async () => {
      const map = await service.buildUserMap(internalOrgId, []);

      expect(map.size).toBe(0);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should deduplicate input IDs', async () => {
      mockDb.where.mockResolvedValue([
        { bluefolderId: 1, displayName: 'Jane Doe' },
      ]);

      const map = await service.buildUserMap(internalOrgId, [1, 1, 1]);

      expect(map.size).toBe(1);
    });
  });

  describe('resolveName', () => {
    it('should return displayName when found in map', () => {
      const map = new Map([[42, 'Jane Doe']]);
      expect(BlueFolderUsersService.resolveName(map, 42)).toBe('Jane Doe');
    });

    it('should return "User #ID" when not found in map', () => {
      const map = new Map<number, string>();
      expect(BlueFolderUsersService.resolveName(map, 99)).toBe('User #99');
    });

    it('should return null for null input', () => {
      const map = new Map<number, string>();
      expect(BlueFolderUsersService.resolveName(map, null)).toBeNull();
    });

    it('should return null for 0 input', () => {
      const map = new Map<number, string>();
      expect(BlueFolderUsersService.resolveName(map, 0)).toBeNull();
    });
  });
});
