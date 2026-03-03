import { mock, jest, describe, it, expect, beforeEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchQueryGeneratorService } from './search-query-generator.service';
import type { ServiceRequestDetail } from '@fieldrunner/shared';

// Shared mock for the create method
const mockCreate = jest.fn();

mock.module('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

function makeSrDetail(
  overrides: Partial<ServiceRequestDetail> = {},
): ServiceRequestDetail {
  return {
    serviceRequestId: 2263,
    description: 'Exterior – Parking Lot Pothole Repair',
    detailedDescription: 'Two pot holes need to be filled in',
    status: 'Assigned',
    priority: '3',
    priorityLabel: 'Normal',
    type: 'Problem',
    billable: true,
    billableTotal: 0,
    billingStatus: 'billable',
    costTotal: 0,
    externalId: null,
    dateTimeCreated: '2026-02-27T00:00:00Z',
    dateTimeClosed: null,
    dueDate: null,
    timeOpenHours: 1.5,
    customerId: 1,
    customerName: 'Seven Eleven',
    customerContactId: null,
    customerContactName: 'N/A',
    customerContactEmail: '',
    customerContactPhone: '',
    customerContactPhoneMobile: '',
    customerLocationId: 1,
    customerLocationName: '40121',
    customerLocationStreetAddress: '3299 Saw Mill Run Blvd',
    customerLocationCity: 'Pittsburgh',
    customerLocationState: 'PA',
    customerLocationPostalCode: '15227',
    customerLocationCountry: 'US',
    customerLocationZone: '',
    customerLocationNotes: '',
    accountManagerId: null,
    accountManagerName: null,
    serviceManagerId: null,
    serviceManagerName: null,
    createdByUserId: null,
    createdByUserName: null,
    isOverdue: false,
    isOpen: true,
    assignments: [],
    labor: [],
    materials: [],
    expenses: [],
    log: [],
    equipment: [],
    customFields: [
      { name: 'Category', value: 'Exterior' },
      { name: 'Vendor Information', value: '' },
    ],
    history: [],
    ...overrides,
  };
}

describe('SearchQueryGeneratorService', () => {
  let service: SearchQueryGeneratorService;

  beforeEach(async () => {
    mockCreate.mockReset();

    const mockConfig = {
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchQueryGeneratorService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(SearchQueryGeneratorService);
  });

  it('should throw if ANTHROPIC_API_KEY is not configured', async () => {
    const emptyConfig = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ConfigService>;

    await expect(
      Test.createTestingModule({
        providers: [
          SearchQueryGeneratorService,
          { provide: ConfigService, useValue: emptyConfig },
        ],
      }).compile(),
    ).rejects.toThrow('ANTHROPIC_API_KEY is not configured');
  });

  describe('generateSearchQueries', () => {
    it('should return parsed queries and category from Claude response', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              queries: [
                'asphalt paving pothole repair',
                'parking lot repair contractor',
              ],
              category: 'Paving & Asphalt',
              reasoning:
                'The SR describes pothole repair in a parking lot, which requires an asphalt/paving contractor.',
            }),
          },
        ],
      });

      const result = await service.generateSearchQueries(makeSrDetail());

      expect(result.queries).toHaveLength(2);
      expect(result.queries[0]).toBe('asphalt paving pothole repair');
      expect(result.category).toBe('Paving & Asphalt');
      expect(result.reasoning).toBeDefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should include SR description, category, and type in the prompt', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              queries: ['pothole repair'],
              category: 'Paving',
              reasoning: 'test',
            }),
          },
        ],
      });

      await service.generateSearchQueries(makeSrDetail());

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('Parking Lot Pothole Repair');
      expect(userMessage).toContain('Two pot holes need to be filled in');
      expect(userMessage).toContain('Exterior');
      expect(userMessage).toContain('Problem');
    });

    it('should fall back to generic queries on API error', async () => {
      mockCreate.mockRejectedValue(new Error('API down'));

      const result = await service.generateSearchQueries(makeSrDetail());

      expect(result.queries.length).toBeGreaterThan(0);
      expect(result.queries[0]).toContain('contractor');
    });

    it('should fall back on malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'not valid json' }],
      });

      const result = await service.generateSearchQueries(makeSrDetail());

      expect(result.queries.length).toBeGreaterThan(0);
    });

    it('should use claude-sonnet-4-6 model', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              queries: ['test'],
              category: 'Test',
              reasoning: 'test',
            }),
          },
        ],
      });

      await service.generateSearchQueries(makeSrDetail());

      expect(mockCreate.mock.calls[0][0].model).toBe('claude-sonnet-4-6');
    });
  });
});
