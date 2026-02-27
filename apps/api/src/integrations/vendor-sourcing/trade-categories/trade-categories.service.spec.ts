import { Test, TestingModule } from '@nestjs/testing';
import { TradeCategoriesService } from './trade-categories.service';
import { DATABASE_CONNECTION } from '../../../core/database/database.module';
import { DEFAULT_TRADE_CATEGORIES } from './default-categories';

describe('TradeCategoriesService', () => {
  let service: TradeCategoriesService;
  let mockDb: any;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeCategoriesService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get(TradeCategoriesService);
  });

  describe('seedDefaults', () => {
    it('should insert default categories for org', async () => {
      await service.seedDefaults(orgId);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            organizationId: orgId,
            name: 'Plumbing',
            isDefault: true,
          }),
        ]),
      );
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.arrayContaining(
          DEFAULT_TRADE_CATEGORIES.map((cat) =>
            expect.objectContaining({ name: cat.name }),
          ),
        ),
      );
    });

    it('should use onConflictDoNothing to be idempotent', async () => {
      await service.seedDefaults(orgId);
      expect(mockDb.onConflictDoNothing).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all categories for org', async () => {
      const mockCategories = [
        { id: '1', name: 'Plumbing', searchQueries: ['plumber'] },
      ];
      mockDb.where.mockResolvedValue(mockCategories);

      const result = await service.findAll(orgId);

      expect(result).toEqual(mockCategories);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });
  });

  describe('resolveSearchQueries', () => {
    it('should return search queries for an exact category match', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Plumbing',
          searchQueries: ['plumber', 'plumbing contractor'],
          googlePlacesType: 'plumber',
        },
      ];
      mockDb.where.mockResolvedValue(mockCategories);

      const result = await service.resolveSearchQueries(orgId, 'Plumbing');

      expect(result).toEqual({
        categoryId: '1',
        queries: ['plumber', 'plumbing contractor'],
        matchLevel: 'exact',
      });
    });

    it('should return case-insensitive match', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Plumbing',
          searchQueries: ['plumber'],
          googlePlacesType: 'plumber',
        },
      ];
      mockDb.where.mockResolvedValue(mockCategories);

      const result = await service.resolveSearchQueries(orgId, 'plumbing');

      expect(result).toEqual(
        expect.objectContaining({ matchLevel: 'exact' }),
      );
    });

    it('should fallback to fuzzy match when no exact match', async () => {
      mockDb.where.mockResolvedValue([
        {
          id: '1',
          name: 'Plumbing',
          searchQueries: ['plumber'],
          googlePlacesType: null,
        },
        {
          id: '2',
          name: 'Electrical',
          searchQueries: ['electrician'],
          googlePlacesType: null,
        },
      ]);

      const result = await service.resolveSearchQueries(orgId, 'Water Pipe Repair');

      expect(result).toEqual(
        expect.objectContaining({ matchLevel: 'fuzzy' }),
      );
    });

    it('should fallback to generic query when nothing matches', async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await service.resolveSearchQueries(orgId, 'Unknown Trade');

      expect(result).toEqual({
        categoryId: null,
        queries: ['contractor'],
        matchLevel: 'fuzzy',
      });
    });
  });
});
