'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import { useApiClient } from '@/lib/api-client-browser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import type {
  ServiceRequestDetail,
  ServiceRequestFile,
  VendorSearchResponse,
} from '@fieldrunner/shared';

import { SrLoading } from './components/sr-loading';
import { SrHeader } from './components/sr-header';
import { SrOverview } from './components/sr-overview';
import { SrFilesTab } from './components/sr-files-tab';
import { SrHistoryTab } from './components/sr-history-tab';
import { SrVendorDebug } from './components/sr-vendor-debug';

export default function ServiceRequestDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const { isLoaded } = useAuth();
  const { apiFetch } = useApiClient();

  const [sr, setSr] = useState<ServiceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<ServiceRequestFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const filesFetchedRef = useRef(false);

  const [vendorSearch, setVendorSearch] = useState<VendorSearchResponse | null>(null);
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
  const [vendorSearchError, setVendorSearchError] = useState<string | null>(null);

  // Fetch SR detail
  useEffect(() => {
    if (!isLoaded || !params.id) return;

    async function fetchDetail() {
      setLoading(true);
      try {
        const data = await apiFetch<ServiceRequestDetail>(
          `/bluefolder/service-requests/${params.id}`,
        );
        setSr(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load service request',
        );
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [isLoaded, params.id, apiFetch]);

  // Lazy-load files
  const fetchFiles = useCallback(async () => {
    if (filesFetchedRef.current || !params.id) return;
    filesFetchedRef.current = true;
    setFilesLoading(true);
    try {
      const data = await apiFetch<ServiceRequestFile[]>(
        `/bluefolder/service-requests/${params.id}/files`,
      );
      setFiles(data);
    } catch (err) {
      setFilesError(
        err instanceof Error ? err.message : 'Failed to load files',
      );
    } finally {
      setFilesLoading(false);
    }
  }, [params.id, apiFetch]);

  // Vendor search
  const runVendorSearch = useCallback(async () => {
    if (!sr || vendorSearchLoading) return;
    setVendorSearchLoading(true);
    setVendorSearchError(null);
    try {
      const data = await apiFetch<VendorSearchResponse>(
        '/vendor-sourcing/search',
        {
          method: 'POST',
          body: JSON.stringify({
            serviceRequestBluefolderId: sr.serviceRequestId,
          }),
        },
      );
      setVendorSearch(data);
    } catch (err) {
      setVendorSearchError(
        err instanceof Error ? err.message : 'Vendor search failed',
      );
    } finally {
      setVendorSearchLoading(false);
    }
  }, [sr, vendorSearchLoading, apiFetch]);

  // Handle tab change — trigger file fetch on "files" tab
  function handleTabChange(value: string) {
    if (value === 'files') fetchFiles();
  }

  if (loading) {
    return <SrLoading />;
  }

  if (error || !sr) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error || 'Service request not found'}
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
            vendorDebug={
              sr.status.toLowerCase() === 'assigned' ? (
                <SrVendorDebug
                  onSearch={runVendorSearch}
                  loading={vendorSearchLoading}
                  error={vendorSearchError}
                  result={vendorSearch}
                />
              ) : null
            }
          />
        </TabsContent>

        <TabsContent value="files">
          <SrFilesTab
            files={files}
            loading={filesLoading}
            error={filesError}
          />
        </TabsContent>

        <TabsContent value="history">
          <SrHistoryTab log={sr.log} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
