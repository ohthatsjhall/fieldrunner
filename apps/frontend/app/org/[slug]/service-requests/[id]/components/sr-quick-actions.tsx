'use client';

import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { ChevronDown, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { ServiceRequestDetail } from '@fieldrunner/shared';

export function SrQuickActions({ sr }: { sr: ServiceRequestDetail }) {
  const [generating, setGenerating] = useState(false);
  const { organization } = useOrganization();

  async function handleDownloadPdf() {
    if (generating) return;
    setGenerating(true);
    try {
      const { downloadSrPdf } = await import('./pdf/download-sr-pdf');
      await downloadSrPdf({
        sr,
        orgName: organization?.name ?? 'Organization',
        orgImageUrl: organization?.imageUrl ?? null,
      });
    } catch (err) {
      console.error('[SrQuickActions] PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
          <ChevronDown className="ml-1.5 size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPdf} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 size-4" />
          )}
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
