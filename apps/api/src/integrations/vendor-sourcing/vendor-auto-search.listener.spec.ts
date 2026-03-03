/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VendorAutoSearchListener } from './vendor-auto-search.listener';
import { VendorSourcingService } from './vendor-sourcing.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import type { SyncCompletedEvent } from '../../common/events/sync.events';

describe('VendorAutoSearchListener', () => {
  let listener: VendorAutoSearchListener;
  let mockVendorSourcing: jest.Mocked<VendorSourcingService>;
  let mockDb: any;

  const payload: SyncCompletedEvent = {
    clerkOrgId: 'org_test123',
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
  };
  const { clerkOrgId, organizationId } = payload;

  beforeEach(async () => {
    mockVendorSourcing = {
      search: jest.fn().mockResolvedValue({
        sessionId: 'session-uuid',
        status: 'completed',
        candidates: [],
        resultCount: 0,
        hasMore: false,
      }),
    } as unknown as jest.Mocked<VendorSourcingService>;

    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorAutoSearchListener,
        { provide: VendorSourcingService, useValue: mockVendorSourcing },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    listener = module.get(VendorAutoSearchListener);
  });

  it('should do nothing when no SRs are assigned', async () => {
    // First DB call: find assigned SRs → empty
    mockDb.where.mockResolvedValueOnce([]);

    await listener.handleSyncCompleted(payload);

    expect(mockVendorSourcing.search).not.toHaveBeenCalled();
  });

  it('should skip SRs that already have a vendor search session', async () => {
    // First DB call: assigned SRs
    mockDb.where.mockResolvedValueOnce([
      { id: 'sr-1', bluefolderId: 1001 },
      { id: 'sr-2', bluefolderId: 1002 },
    ]);
    // Second DB call: existing sessions → both already searched
    mockDb.where.mockResolvedValueOnce([
      { serviceRequestId: 'sr-1' },
      { serviceRequestId: 'sr-2' },
    ]);

    await listener.handleSyncCompleted(payload);

    expect(mockVendorSourcing.search).not.toHaveBeenCalled();
  });

  it('should search vendors for assigned SRs without existing sessions', async () => {
    // First DB call: assigned SRs
    mockDb.where.mockResolvedValueOnce([
      { id: 'sr-1', bluefolderId: 1001 },
      { id: 'sr-2', bluefolderId: 1002 },
    ]);
    // Second DB call: existing sessions → only sr-1 searched
    mockDb.where.mockResolvedValueOnce([{ serviceRequestId: 'sr-1' }]);

    await listener.handleSyncCompleted(payload);

    // Only sr-2 should be searched
    expect(mockVendorSourcing.search).toHaveBeenCalledTimes(1);
    expect(mockVendorSourcing.search).toHaveBeenCalledWith(clerkOrgId, {
      serviceRequestBluefolderId: 1002,
      initiatedBy: 'auto',
    });
  });

  it('should pass initiatedBy: "auto" to each search call', async () => {
    mockDb.where
      .mockResolvedValueOnce([{ id: 'sr-1', bluefolderId: 1001 }])
      .mockResolvedValueOnce([]); // no existing sessions

    await listener.handleSyncCompleted(payload);

    expect(mockVendorSourcing.search).toHaveBeenCalledWith(
      clerkOrgId,
      expect.objectContaining({ initiatedBy: 'auto' }),
    );
  });

  it('should continue processing remaining SRs when one search fails', async () => {
    jest.useFakeTimers();

    mockDb.where
      .mockResolvedValueOnce([
        { id: 'sr-1', bluefolderId: 1001 },
        { id: 'sr-2', bluefolderId: 1002 },
      ])
      .mockResolvedValueOnce([]); // no existing sessions

    mockVendorSourcing.search
      .mockRejectedValueOnce(new Error('Search failed for sr-1'))
      .mockResolvedValueOnce({
        sessionId: 'session-2',
        status: 'completed',
        searchQuery: 'plumber',
        searchAddress: '123 Main St',
        candidates: [],
        resultCount: 0,
        hasMore: false,
        durationMs: 100,
      });

    const promise = listener.handleSyncCompleted(payload);

    // Advance past the 5s rate-limit delay
    await jest.advanceTimersByTimeAsync(5000);
    await promise;

    // Both SRs should have been attempted
    expect(mockVendorSourcing.search).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should not throw when the outer try/catch catches a DB error', async () => {
    mockDb.where.mockRejectedValueOnce(new Error('DB connection lost'));

    // Should not throw — errors are caught and logged
    await expect(
      listener.handleSyncCompleted(payload),
    ).resolves.toBeUndefined();
  });
});
