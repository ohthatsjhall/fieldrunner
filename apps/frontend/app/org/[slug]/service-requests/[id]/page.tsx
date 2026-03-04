'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  useServiceRequestDetail,
  useServiceRequestFiles,
  useVendorSearchResults,
  useVendorSearch,
} from '@/hooks/queries';

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
  const {
    data: vendorResults,
    isLoading: resultsLoading,
  } = useVendorSearchResults(bluefolderId);
  const vendorSearch = useVendorSearch(bluefolderId);

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
        <div className="flex items-center justify-between">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <SrOverview
            sr={sr}
            vendors={
              sr.status.toLowerCase() === 'assigned' ? (
                <SrVendors
                  sr={sr}
                  results={vendorResults ?? null}
                  resultsLoading={resultsLoading}
                  onReSearch={() =>
                    vendorSearch.mutate({
                      serviceRequestBluefolderId: sr.serviceRequestId,
                    })
                  }
                  reSearchLoading={vendorSearch.isPending}
                  reSearchError={vendorSearch.error?.message ?? null}
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
