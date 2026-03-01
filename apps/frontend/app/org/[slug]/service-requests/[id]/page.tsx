'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  useServiceRequestDetail,
  useServiceRequestFiles,
  useVendorSearch,
  useLoadMoreVendors,
} from '@/hooks/queries';
import type { VendorCandidate } from '@fieldrunner/shared';

import { SrLoading } from './components/sr-loading';
import { SrHeader } from './components/sr-header';
import { SrOverview } from './components/sr-overview';
import { SrFilesTab } from './components/sr-files-tab';
import { SrHistoryTab } from './components/sr-history-tab';
import { SrVendors } from './components/sr-vendors';

export default function ServiceRequestDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const bluefolderId = Number(params.id);

  const { data: sr, isLoading, error } = useServiceRequestDetail(bluefolderId);
  const [filesEnabled, setFilesEnabled] = useState(false);
  const { data: files = [], isLoading: filesLoading, error: filesError } =
    useServiceRequestFiles(bluefolderId, filesEnabled);
  const vendorSearch = useVendorSearch();
  const loadMore = useLoadMoreVendors();

  // Accumulate candidates across search + load-more calls
  const [allCandidates, setAllCandidates] = useState<VendorCandidate[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const lastSessionId = useRef<string | null>(null);

  // Reset on new search result
  useEffect(() => {
    if (vendorSearch.data && vendorSearch.data.sessionId !== lastSessionId.current) {
      lastSessionId.current = vendorSearch.data.sessionId;
      setAllCandidates(vendorSearch.data.candidates);
      setHasMore(vendorSearch.data.hasMore ?? false);
    }
  }, [vendorSearch.data]);

  // Append on load-more success
  useEffect(() => {
    if (loadMore.data) {
      setAllCandidates((prev) => [...prev, ...loadMore.data!.candidates]);
      setHasMore(loadMore.data.hasMore);
    }
  }, [loadMore.data]);

  function handleTabChange(value: string) {
    if (value === 'files') setFilesEnabled(true);
  }

  if (isLoading) {
    return <SrLoading />;
  }

  if (error || !sr) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error?.message || 'Service request not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SrHeader sr={sr} slug={params.slug} />

      <Tabs defaultValue="overview" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SrOverview
            sr={sr}
            vendors={
              sr.status.toLowerCase() === 'assigned' ? (
                <SrVendors
                  onSearch={() =>
                    vendorSearch.mutate({
                      serviceRequestBluefolderId: sr.serviceRequestId,
                    })
                  }
                  loading={vendorSearch.isPending}
                  error={vendorSearch.error?.message ?? null}
                  result={
                    vendorSearch.data
                      ? {
                          ...vendorSearch.data,
                          candidates: allCandidates,
                          resultCount: allCandidates.length,
                          hasMore,
                        }
                      : null
                  }
                  onLoadMore={() => {
                    if (lastSessionId.current) {
                      loadMore.mutate({ sessionId: lastSessionId.current });
                    }
                  }}
                  loadingMore={loadMore.isPending}
                />
              ) : null
            }
          />
        </TabsContent>

        <TabsContent value="files">
          <SrFilesTab
            files={files}
            loading={filesLoading}
            error={filesError?.message ?? null}
          />
        </TabsContent>

        <TabsContent value="history">
          <SrHistoryTab log={sr.log} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
