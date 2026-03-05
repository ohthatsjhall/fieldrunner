/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { OrganizationSettingsService } from '../org/settings/settings.service';
import { DATABASE_CONNECTION } from '../core/database/database.module';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockDb: any;

  const clerkOrgId = 'org_test123';
  const internalOrgId = '550e8400-e29b-41d4-a716-446655440000';

  const emptySnapshot = {
    rows: [
      {
        created_this_week: '0',
        closed_this_week: '0',
        total_open: '0',
        in_progress: '0',
        avg_days_to_close: null,
      },
    ],
  };
  const emptyRows = { rows: [] };

  beforeEach(async () => {
    mockSettings = {
      resolveOrgId: jest.fn().mockResolvedValue(internalOrgId),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    mockDb = {
      execute: jest.fn().mockResolvedValue(emptyRows),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: OrganizationSettingsService, useValue: mockSettings },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('getDashboard', () => {
    it('should resolve org ID via settings service', async () => {
      mockDb.execute.mockResolvedValue(emptyRows);

      await service.getDashboard(clerkOrgId);

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith(clerkOrgId);
    });

    it('should call all queries in parallel and return full shape', async () => {
      mockDb.execute
        .mockResolvedValueOnce({
          rows: [
            {
              created_this_week: '3',
              closed_this_week: '1',
              total_open: '10',
              in_progress: '4',
              avg_days_to_close: '5.2',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { month: 'Jan 2025', month_date: '2025-01-01', created: '8', resolved: '5' },
            { month: 'Feb 2025', month_date: '2025-02-01', created: '12', resolved: '10' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { month: 'Jan 2025', from_status: 'New', avg_hours: '12.5' },
            { month: 'Jan 2025', from_status: 'Assigned', avg_hours: '8.2' },
            { month: 'Feb 2025', from_status: 'New', avg_hours: '10.0' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { month: 'Jan 2025', avg_days: '5.3' },
            { month: 'Feb 2025', avg_days: '4.1' },
          ],
        });

      const result = await service.getDashboard(clerkOrgId);

      expect(result.snapshot).toEqual({
        createdThisWeek: 3,
        closedThisWeek: 1,
        totalOpen: 10,
        inProgress: 4,
        avgDaysToClose: 5.2,
      });

      expect(result.ticketVolume).toEqual([
        { month: 'Jan 2025', created: 8, resolved: 5 },
        { month: 'Feb 2025', created: 12, resolved: 10 },
      ]);

      expect(result.stageDurations).toEqual([
        { month: 'Jan 2025', stages: { New: 12.5, Assigned: 8.2 } },
        { month: 'Feb 2025', stages: { New: 10.0 } },
      ]);

      expect(result.resolutionRate).toEqual([
        { month: 'Jan 2025', created: 8, resolved: 5, rate: 62.5 },
        { month: 'Feb 2025', created: 12, resolved: 10, rate: 83.3 },
      ]);

      expect(result.timeToClose).toEqual([
        { month: 'Jan 2025', avgDays: 5.3 },
        { month: 'Feb 2025', avgDays: 4.1 },
      ]);
    });

    it('should return zeros and empty arrays when org has no data', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId);

      expect(result.snapshot).toEqual({
        createdThisWeek: 0,
        closedThisWeek: 0,
        totalOpen: 0,
        inProgress: 0,
        avgDaysToClose: null,
      });
      expect(result.ticketVolume).toEqual([]);
      expect(result.stageDurations).toEqual([]);
      expect(result.resolutionRate).toEqual([]);
      expect(result.timeToClose).toEqual([]);
    });

    it('should handle snapshot with null avg_days_to_close', async () => {
      mockDb.execute
        .mockResolvedValueOnce({
          rows: [
            {
              created_this_week: '2',
              closed_this_week: '0',
              total_open: '5',
              in_progress: '1',
              avg_days_to_close: null,
            },
          ],
        })
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId);

      expect(result.snapshot.avgDaysToClose).toBeNull();
    });

    it('should pivot stage duration rows into Record<string, number> per month', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce({
          rows: [
            { month: 'Mar 2025', from_status: 'New', avg_hours: '24.5' },
            { month: 'Mar 2025', from_status: 'In Progress', avg_hours: '48.0' },
            { month: 'Mar 2025', from_status: 'Assigned', avg_hours: '12.3' },
          ],
        })
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId);

      expect(result.stageDurations).toHaveLength(1);
      expect(result.stageDurations[0]).toEqual({
        month: 'Mar 2025',
        stages: { New: 24.5, 'In Progress': 48.0, Assigned: 12.3 },
      });
    });

    it('should handle resolution rate divide-by-zero when 0 created in a month', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce({
          rows: [
            { month: 'Jan 2025', month_date: '2025-01-01', created: '0', resolved: '3' },
          ],
        })
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId);

      expect(result.resolutionRate[0].rate).toBe(0);
    });

    it('should round time-to-close to 1 decimal', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce({
          rows: [{ month: 'Jan 2025', avg_days: '5.3456' }],
        });

      const result = await service.getDashboard(clerkOrgId);

      expect(result.timeToClose[0].avgDays).toBe(5.3);
    });

    it('should round resolution rate to 1 decimal', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce({
          rows: [
            { month: 'Jan 2025', month_date: '2025-01-01', created: '3', resolved: '1' },
          ],
        })
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId);

      expect(result.resolutionRate[0].rate).toBe(33.3);
    });

    it('should parse PostgreSQL string values to numbers', async () => {
      mockDb.execute
        .mockResolvedValueOnce({
          rows: [
            {
              created_this_week: '15',
              closed_this_week: '8',
              total_open: '42',
              in_progress: '12',
              avg_days_to_close: '7.89',
            },
          ],
        })
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId);

      expect(typeof result.snapshot.createdThisWeek).toBe('number');
      expect(typeof result.snapshot.closedThisWeek).toBe('number');
      expect(typeof result.snapshot.totalOpen).toBe('number');
      expect(typeof result.snapshot.inProgress).toBe('number');
      expect(typeof result.snapshot.avgDaysToClose).toBe('number');
    });

    it('should accept range param and still return valid data', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId, '6m');

      expect(result).toHaveProperty('snapshot');
      expect(result).toHaveProperty('ticketVolume');
      expect(result).toHaveProperty('stageDurations');
      expect(result).toHaveProperty('resolutionRate');
      expect(result).toHaveProperty('timeToClose');
      // Should still call execute 4 times (snapshot + 3 chart queries)
      expect(mockDb.execute).toHaveBeenCalledTimes(4);
    });

    it('should treat invalid range as "all" (no cutoff)', async () => {
      mockDb.execute
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows)
        .mockResolvedValueOnce(emptyRows);

      const result = await service.getDashboard(clerkOrgId, 'invalid');

      expect(result).toHaveProperty('snapshot');
      expect(mockDb.execute).toHaveBeenCalledTimes(4);
    });
  });
});
